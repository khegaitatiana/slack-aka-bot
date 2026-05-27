# aka — Slack People Finder Bot

Find colleagues by nickname, name, position, or location in Slack.

## Setup

1. Clone the repo and install dependencies
2. Copy `.env.example` to `.env` and fill in:
   - `SLACK_BOT_TOKEN`
   - `SLACK_SIGNING_SECRET`
   - `HUMAANS_API_KEY`
   - `HUMAANS_ORG_ID`
   - `NICKNAME_FILE_PATH`
3. Add your nickname file at `./data/nicknames.json`
4. Run: `npm start`

## Usage

```
/aka Sasha
/aka Alex iOS
/aka Sasha designer Kyiv
@aka Aleksandr
```

## Nickname File Format

```json
{
  "Aleksandr": ["Sasha", "Alex", "Aleks"],
  "Mikhail": ["Misha", "Mike"],
  "Natalia": ["Natasha", "Nat"]
}
```

## Environment Variables

| Variable | Required |
|---|---|
| `SLACK_BOT_TOKEN` | Yes |
| `SLACK_SIGNING_SECRET` | Yes |
| `HUMAANS_API_KEY` | Yes |
| `HUMAANS_ORG_ID` | Yes |
| `NICKNAME_FILE_PATH` | Yes |

## License

MIT
