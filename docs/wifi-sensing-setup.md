# Wi-Fi CSI Prototype Setup

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Open API docs at `http://localhost:8000/docs`.

## Web dashboard

```bash
cd frontend
npm install
NEXT_PUBLIC_CSI_API_URL=http://localhost:8000 npm run dev
```

Open `http://localhost:3000/wifi-sensing`.

## Useful simulated-mode API calls

```bash
curl -X POST http://localhost:8000/api/simulator/state   -H 'Content-Type: application/json'   -d '{"state":"OCCUPIED"}'
```

States: `EMPTY`, `OCCUPIED`, `MOTION`, `UNSTABLE`.
