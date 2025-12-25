# Spill iOS App

This is the iOS client application for Spill.

## Architecture

iOS communicates with backend exclusively via HTTP APIs. Backend remains the source of truth for all visibility, voting, and integrity rules.

Client must not infer or reimplement backend rules.

## Directory Structure

```
Spill/
├── App/              # App entry point, root views
├── Features/         # Feature-based organization
│   ├── Auth/        # Authentication flows
│   ├── Polls/       # Poll creation and viewing
│   ├── Votes/       # Voting functionality
│   ├── Feed/        # Feed generation and display
│   └── Profile/     # User profiles
├── Services/
│   └── APIClient.swift  # HTTP client for backend API
├── Models/          # Data models matching API contracts
└── Utils/           # Shared utilities
```

## API Communication

All API communication goes through `Services/APIClient.swift`, which should:
- Use the API contracts defined in `app/backend-api/src/api-contract/`
- Handle authentication (Clerk tokens)
- Parse responses using Zod-validated schemas
- Handle errors consistently

## Development

This iOS project is a separate app from the backend and admin UI. It should be built and run independently, communicating with the backend API over HTTP.

