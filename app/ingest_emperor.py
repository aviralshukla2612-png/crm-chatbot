import asyncio
import httpx
from db import get_connection

OLLAMA_URL = "http://ollama:11434"
EMBED_MODEL = "nomic-embed-text"

DOCUMENTS = [
    {
        "title": "Company Profile, Leadership & Business Policies",
        "category": "Company Overview",
        "content": """Company: Emperor Smart Solutions
Owners & Leadership: Karan Makwana & Yash Sharma
Business Type: Technology Solutions and Digital Transformation Company
Primary Market: India
Currency: Indian Rupees (INR / ₹)
Services Offered: Website Development, Web Applications, ERP Development, CRM Development, Custom Software, SEO, Digital Marketing, E-commerce, Mobile Applications (Android & Flutter), UI/UX Design, Maintenance & Cloud Deployment.
Tax Policy: GST is not included in quoted prices and is applicable extra on all invoices.
Discounts: Standard projects do not receive automatic discounts. Website + SEO (up to 5% on website), ERP + CRM (up to 7% on development), Website + Digital Marketing (up to 5% on website). All discounts strictly require approval from management (Karan Makwana & Yash Sharma)."""
    },
    {
        "title": "Website Development & E-Commerce Pricing",
        "category": "Website Development",
        "content": """Website Development Services:
1. Basic Business Website (Up to 5 pages, responsive, contact form, WhatsApp, basic SEO, deployment): Starting from ₹25,000. Delivery: 7-12 working days. (No admin panel, no payment gateway).
2. Professional Business Website (Up to 10 pages, premium UI/UX, animations, Google Analytics, Search Console, deployment, speed optimization): Starting from ₹45,000. Delivery: 12-20 working days.
3. Premium Corporate Website (Up to 15 pages, custom UI/UX, CMS integration, blog system, admin panel, security config): Starting from ₹75,000. Delivery: 20-30 working days.
4. E-Commerce Website (Product catalog, filters, cart, checkout, payment gateway, order management, admin dashboard, coupons): Starting from ₹85,000. Delivery: 25-40 working days. (Payment gateway integration: ₹15,000 extra; transaction charges separate).
5. Custom Web Application (SaaS products, business portals, role-based access, backend APIs, database): Starting from ₹1,25,000+ depending on requirements."""
    },
    {
        "title": "Custom ERP Systems & Custom Modules",
        "category": "ERP Development",
        "content": """ERP Development Solutions:
1. ERP Starter (For small businesses: Dashboard, Products, Customers, Suppliers, Inventory, Purchases, Sales, User management): Starting from ₹2,50,000. Delivery: 45-60 working days.
2. ERP Professional (Sales, Purchase, Inventory, Stock management, Customers, Suppliers, Employees, Accounting, Invoices, Payments, Audit logs): Starting from ₹5,00,000. Delivery: 60-90 working days.
3. ERP Enterprise (Complete business suite: Warehouse, Production, Finance, HR, GSTR-1 & GST reports, Multi-branch, Dashboard analytics, API integrations): Starting from ₹8,50,000. Delivery: 90-150 working days.
Custom Module Add-ons: Inventory (₹60,000), Sales (₹75,000), Purchase (₹60,000), Accounting (₹1,00,000), Production (₹1,25,000), HR (₹75,000), CRM Module (₹75,000), GST Reporting (₹50,000), Advanced Analytics (₹75,000), Multi-Branch Management (₹1,00,000), API Integration (Starting from ₹25,000/integration)."""
    },
    {
        "title": "CRM Solutions & Automation",
        "category": "CRM Development",
        "content": """CRM Development Packages:
1. CRM Basic (Lead management, customer & contact management, follow-ups, sales pipeline, tasks, dashboard): Starting from ₹1,50,000.
2. CRM Professional (Deal management, reminders, email integration, WhatsApp integration, sales reports, user roles, activity history): Starting from ₹3,00,000.
3. CRM Enterprise (Multiple sales teams, territory management, automated follow-ups, WhatsApp & email automation, campaign management, sales forecasting, custom workflows): Starting from ₹5,50,000."""
    },
    {
        "title": "Mobile Application Development (Android & Flutter)",
        "category": "Mobile Apps",
        "content": """Mobile Application Development:
1. Basic Mobile Application (Android platform, up to 10 screens, API integration, authentication, push notifications, Play Store deployment support): Starting from ₹1,50,000.
2. Cross-Platform Mobile Application (Flutter framework for Android + iOS, custom UI, authentication, API & backend integration, push notifications): Starting from ₹2,50,000.
3. Advanced Mobile Application (Android + iOS, advanced UI/UX, in-app payments, real-time functionality, API integrations, admin panel, analytics): Starting from ₹4,50,000."""
    },
    {
        "title": "SEO & Digital Marketing Packages",
        "category": "Digital Marketing",
        "content": """Search Engine Optimization (SEO):
- SEO Basic: ₹12,000/month (Keyword research, On-page SEO, technical audit, monthly report).
- SEO Professional: ₹25,000/month (Content optimization, competitor analysis, local SEO, Google Business Profile, backlinks).
- SEO Enterprise: ₹50,000/month (Authority building, conversion optimization, strategy meetings, detailed analytics).
Note: Minimum engagement is 3 months. SEO cannot guarantee a specific Google ranking position.

Digital Marketing & Social Media:
- Social Media Basic: ₹15,000/month (12 posts, graphic design, Instagram & Facebook management).
- Social Media Professional: ₹30,000/month (16 posts, 8 stories, creative copy, Instagram, Facebook, LinkedIn, strategy).
- Digital Marketing Professional: ₹45,000/month (Social media, Google Ads & Meta Ads management, SEO coordination, strategy).
- Digital Marketing Enterprise: ₹75,000/month (Omnichannel marketing, advanced reporting, conversion optimization).
Note: Advertising budget (Google/Meta ad spend) is separate (recommended ₹20,000 - ₹1,00,000/month)."""
    },
    {
        "title": "UI/UX Design, Maintenance & Integrations",
        "category": "Design & Support",
        "content": """Design & Maintenance Services:
- UI/UX: Landing Page (₹15,000), Business Website (₹35,000), Dashboard UI/UX (₹50,000), SaaS Product UI/UX (₹75,000+), Design System (₹1,00,000+).
- Maintenance: Basic (₹5,000/month), Professional (₹10,000/month), Enterprise (₹25,000/month).
- Deployment & Cloud: Basic Deployment (₹5,000), Professional (₹10,000), Cloud Setup (₹15,000+), Server Config (₹10,000+). Hosting and domain are billed separately.
- Integrations: WhatsApp Integration (₹15,000+), Payment Gateway (₹15,000+), Google Maps/Analytics/Search Console (₹5,000 each), Email Integration (₹10,000), Third-Party API (₹15,000+), AI Chatbot (₹50,000+), AI RAG Chatbot (₹1,00,000+), WhatsApp AI Chatbot (₹1,50,000+)."""
    },
    {
        "title": "Growth Bundles & Quotation Packages",
        "category": "Packages",
        "content": """Turnkey Growth Packages:
1. Digital Growth Package: Professional Website (₹45,000) + Monthly SEO Professional (₹25,000/mo) + Social Media Professional (₹30,000/mo) = First month total ₹1,00,000 (Ongoing monthly marketing: ₹55,000/mo). GST extra.
2. Business Transformation Package: Premium Corporate Website (₹75,000) + CRM Professional (₹3,00,000) + Monthly SEO (₹25,000/mo) + Digital Marketing (₹45,000/mo) = First month total ₹4,45,000 (One-time dev ₹3,75,000 + monthly marketing ₹70,000). GST extra.
3. Complete Digital Enterprise Package: Enterprise ERP (₹8,50,000) + Enterprise CRM (₹5,50,000) + Premium Corporate Website (₹75,000) + AI Chatbot (₹50,000) + Enterprise SEO (₹50,000/mo) + Enterprise Digital Marketing (₹75,000/mo) = First month total ₹16,50,000 (Initial development ₹15,25,000 + monthly marketing ₹1,25,000). GST extra."""
    },
    {
        "title": "Payment Terms & Lead Qualification Guidelines",
        "category": "Sales Operations",
        "content": """Payment Terms:
- Standard Website: 40% advance, 40% after design approval, 20% before final deployment.
- ERP / CRM: 30% advance, 30% after core module completion, 25% during testing/UAT, 15% before production deployment.
- Small Projects below ₹50,000: 50% advance, 50% before delivery.
- Monthly SEO & Digital Marketing: Billed in advance at the start of each month.

Lead Qualification Parameters (BANT):
When a customer asks for a quotation, collect: Customer name, Company name, Phone number, Email, Business type, Required service, Scope details (pages for website, users and branches for ERP, lead volume and channels for CRM), Expected timeline, and Approximate budget."""
    },
    {
        "title": "10 Golden Rules for Sales Reps",
        "category": "Sales Policies",
        "content": """10 Golden Rules:
1. Never invent a price not present in this knowledge base.
2. For custom ERP, CRM, or Web Applications, explain that the final price depends on exact scope.
3. Always quote starting prices in INR (₹).
4. Clearly mention that GST is applicable extra.
5. Advertising budget is separate from digital marketing management fees.
6. Hosting and domain infrastructure are charged separately based on provider.
7. Payment gateway transaction fees are charged separately by providers.
8. SEO cannot guarantee a specific Google ranking position.
9. Never promise discounts without prior approval from management (Karan Makwana & Yash Sharma).
10. For custom projects, collect requirements before providing a final quotation."""
    }
]

async def get_embedding(client, text: str):
    res = await client.post(
        f"{OLLAMA_URL}/api/embed",
        json={"model": EMBED_MODEL, "input": text},
        timeout=60.0
    )
    if res.status_code == 200:
        embeddings = res.json().get("embeddings", [])
        return embeddings[0] if embeddings else None
    return None

async def run_ingestion():
    conn = get_connection()
    cur = conn.cursor()
    
    # Clean previous demo records to ensure fresh knowledge base
    cur.execute("TRUNCATE TABLE knowledge_chunks;")
    conn.commit()
    print("Previous records cleared.")

    async with httpx.AsyncClient() as client:
        for idx, doc in enumerate(DOCUMENTS, 1):
            print(f"[{idx}/{len(DOCUMENTS)}] Vectorizing: {doc['title']}...")
            emb = await get_embedding(client, doc["content"])
            if emb:
                cur.execute(
                    "INSERT INTO knowledge_chunks (title, category, content, embedding) VALUES (%s, %s, %s, %s);",
                    (doc["title"], doc["category"], doc["content"], emb)
                )
                conn.commit()
                print(f"  ✓ Stored with {len(emb)}-dim embedding.")
            else:
                print(f"  ✗ Failed to vectorize: {doc['title']}")

    cur.close()
    conn.close()
    print("\n🎉 Emperor Smart Solutions Knowledge Base successfully ingested into pgvector!")

if __name__ == "__main__":
    asyncio.run(run_ingestion())
