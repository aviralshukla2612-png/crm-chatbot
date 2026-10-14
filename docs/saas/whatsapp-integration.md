# META WHATSAPP CLOUD API INTEGRATION

## 1. Overview
The platform integrates Meta WhatsApp Cloud API directly with the existing consultative sales qualification state machine and lead extraction engine.

## 2. Webhook Architecture (`frontend/app/api/whatsapp/webhook/route.js`, `frontend/lib/integrations/whatsappService.js`)

```
[ Customer WhatsApp App ]
            │ (Message: "Hi, need a mobile app for clinic")
            ▼
[ Meta WhatsApp Cloud API ]
            │ (HTTPS POST + x-hub-signature-256)
            ▼
[ Next.js Inbound Receiver: /api/whatsapp/webhook ]
            │
            ├── 1. Signature Verification (HMAC SHA-256 with WHATSAPP_APP_SECRET)
            ├── 2. Idempotency Guard (Deduplicates messageId)
            ├── 3. Tenant Mapping (Maps phone_number_id -> organizationId, botId)
            ├── 4. Sales State Machine (handleSalesFlowTurn -> qualified response)
            ├── 5. Lead Extraction (+91 phone regex -> table "Lead")
            │
            ▼ (HTTPS POST Graph API v21.0)
[ Meta WhatsApp Cloud API ] ──> [ Customer Receives Consultative Reply ]
```

## 3. Endpoints & Protocol
- **Verification Endpoint (GET `/api/whatsapp/webhook`):**
  - Responds to Meta subscription handshake when `hub.verify_token === WHATSAPP_VERIFY_TOKEN`.
  - Returns `hub.challenge` as plain text with status HTTP 200.
- **Message Receiver (POST `/api/whatsapp/webhook`):**
  - Validates `x-hub-signature-256`.
  - Normalizes payloads from Meta's nested structure.
  - Generates replies grounded in Emperor Smart Solutions company services.
  - Automatically captures Indian contact numbers (`+91`) and posts leads into table `Lead`.
