"use client";

import * as React from "react";
import { Search, ExternalLink, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { api, ApiError, type AdminSearchResult } from "@/lib/api";

const sourceVariant: Record<AdminSearchResult["source"], "primary" | "success" | "outline"> = {
  vector: "primary",
  keyword: "outline",
  hybrid: "success",
};

export function AdminTalentSearch() {
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<AdminSearchResult[]>([]);
  const [searched, setSearched] = React.useState(false);
  const [lastQuery, setLastQuery] = React.useState("");

  const runSearch = React.useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      toast.error("Enter a search query");
      return;
    }
    setLoading(true);
    setSearched(true);
    setLastQuery(trimmed);
    try {
      const data = await api.admin.search(trimmed);
      setResults(data.results);
    } catch (err) {
      setResults([]);
      toast.error(err instanceof ApiError ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Talent search"
        description="Semantic + keyword search across profiles, skills, projects, and resumes. Works without Ollama via keyword fallback."
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder='e.g. "React cybersecurity internship" or a name'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runSearch(query);
              }}
              aria-label="Talent search query"
            />
          </div>
          <Button onClick={() => void runSearch(query)} disabled={loading}>
            {loading ? <Spinner className="size-4" /> : "Search"}
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" /> Searching…
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <Card>
          <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
            <p>No matches for “{lastQuery}”.</p>
            <p>
              Tip: keyword search works without embeddings. For semantic ranking, run Ollama and
              process resumes so vectors are stored.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length === 1 ? "" : "s"} for “{lastQuery}”
          </p>
          <ul className="space-y-3">
            {results.map((r) => (
              <li key={r.studentId}>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{r.name}</h3>
                        <Badge variant={sourceVariant[r.source]}>{r.source}</Badge>
                        <Badge variant="outline">{Math.round(r.score * 100)}% match</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[r.major, r.university].filter(Boolean).join(" · ") || "—"}
                        {r.email ? ` · ${r.email}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Matched in <span className="font-medium">{r.matchedSection}</span>
                      </p>
                      {r.snippet && (
                        <p className="line-clamp-2 text-sm">{r.snippet}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button variant="outline" size="sm" href={r.profileUrl}>
                        <ExternalLink className="size-3.5" />
                        Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" />
            Hybrid = both vector and keyword matched this student.
          </p>
        </div>
      )}
    </div>
  );
}
