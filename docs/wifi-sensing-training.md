# Training and Calibration

## Initial classes

The baseline model trains two classes:

- `EMPTY`
- `OCCUPIED`

Motion samples are currently normalized into the occupied class and separately surfaced through feature-based motion detection. This leaves room for a future three-class model with `MOTION` as a first-class label.

## Training mode labels

The API and dashboard can collect:

- Room empty (`EMPTY`)
- Person enters (`PERSON_ENTERS`)
- Person standing (`PERSON_STANDING`)
- Person sitting (`PERSON_SITTING`)
- Person moving (`PERSON_MOVING`)
- Person leaves (`PERSON_LEAVES`)

## Calibration wizard

1. Connect the sensing device.
2. Select the room.
3. Leave the room empty for 30-60 seconds.
4. Collect baseline Wi-Fi CSI measurements.
5. Ask the user to enter the room.
6. Collect occupied CSI measurements.
7. Train/calibrate the Random Forest model.
8. Show detection accuracy.

The simulated backend shortens each collection step for development. Increase `sample_count` or sample rate windows before field testing.
