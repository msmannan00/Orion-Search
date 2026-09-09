# Report: strategic

## Description

Get a specific strategic intelligence report aggregating crawled content from onion, I2P, and similar hidden-service pages by its report ID.

The request is an HTTP GET and accepts:
- **doc_id** (path) — string identifier of the strategic (generic) report document
- **lang** (query, optional) — language code for localized narrative content.

No request body is required.

## Response

Strategic darkweb intelligence document representing a single crawled page (such as a marketplace listing, forum thread or generic page), returned as a JSON object.

Core response fields typically include:
- **m_base_url** — base URL of the hidden service or site
- **m_url** — specific page URL
- **m_network** — network type (e.g. `onion`)
- **m_title** — page title as seen in the source
- **m_meta_description** — meta description extracted from the HTML, if available
- **m_content** — normalized text content extracted from the page
- **m_important_content** — key snippet or condensed portion of the most relevant text
- **m_images** — list of image URLs extracted from the page
- **m_sub_url** — list of internal navigation or related links
- **m_validity_score** — internal confidence/validity score for the crawled document
- **m_meta_keywords** — keyword string summarizing tags, topics and SEO-style keywords (when available)
- **m_content_type** — internal classification labels such as `marketplaces`, `general`, `forums`
- **m_country** — list of associated countries inferred from the content or targeting
- **m_location** — list of locations or regions mentioned or targeted
- **m_organization** — extracted organizations or platforms mentioned
- **m_language** — detected language(s) of the content
- **m_currencies** — list of currencies mentioned or used on the page
- **m_domain** — list of domains associated with the page and its references
- **m_hash_content** — hash of the normalized page content
- **m_hash_url** — hash of the page URL
- **m_hash** — internal document hash identifier used for deduplication and correlation
- **m_update_date** — last time the document was updated in the system
- **m_creation_date** — first time the document was created/ingested into the system

Depending on the source, additional enrichment fields may be present, such as forum-specific metadata, structured attributes describing the section or category, or clearnet reference links.

Example response:
```json
{
  "m_base_url": "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion",
  "m_url": "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/popular/442",
  "m_network": "onion",
  "m_title": "giftcardxpress - buy cheap gift cards",
  "m_meta_description": "save up to 70% on all your favorite gift cards",
  "m_content": "save up to 70 on all your favorite gift cards\nsave up to 70% on all your favorite gift cards\nSave up to 70% on all your favorite gift cards",
  "m_important_content": "no description found but contains some urls. this website is most probably a search engine or only contain references of other websites giftcardxpress - buy cheap gift cards save up to 70% on all your favorite",
  "m_images": [
    "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/static/assets/amazon.png",
    "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/static/assets/amazon.png"
  ],
  "m_sub_url": [
    "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/popular/823",
    "http://cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion/new_arraival/823"
  ],
  "m_validity_score": 0,
  "m_content_type": ["marketplaces"],
  "m_domain": [
    "amazon.de",
    "cards3wmb7atxhczo33trz5lhzcmfjftreyap2povmftd7g22u4holyd.onion"
  ],
  "m_country": ["Spain", "Netherlands", "Germany", "France"],
  "m_organization": ["Amazon", "Fortnite", "iTunes", "GiftCardXpress", "Google", "Steam", "Netflix"],
  "m_location": ["Spain", "Germany", "France"],
  "m_language": ["en"],
  "m_currencies": ["USD", "EUR", "GBP"],
  "m_update_date": "2025-12-02T13:13:55.970184+00:00",
  "m_hash_content": "7c2739bc52efab970134f87542ac382daf25a1fa429aa0a15cbacbe30740b896",
  "m_hash_url": "3fa64feadef7ea1a7765ee0849e6797838a468b3496759042ca7f33c22b9d6f9",
  "m_hash": "c8790e0132c7fdfbbf6420cc9a73f478fbfc884202a5dab6f6ad3f1195882bbd",
  "m_creation_date": "2025-12-02T13:13:55.970231+00:00"
}
```


Additionally, the response may include automatically extracted indicators of compromise (IOCs). Only indicators that are actually found in the underlying content are returned; IOC fields with no data are omitted from the response.

Supported IOC / enrichment fields:
- **m_phone_number** — Phone Numbers
- **m_email** — Emails
- **m_domain** — Domains
- **m_country** — Country
- **m_url** — URLs
- **m_cve** — CVE & CWE
- **m_ip** — IP Addresses
- **m_yara_rule** — YARA Rules
- **m_encoded_urls** — Encoded URLs
- **m_file_paths** — File Paths
- **m_credit_card** — Credit Cards
- **m_org** — Organizations
- **m_company_name** — Company Names
- **m_person** — Persons
- **m_location** — Locations
- **m_language** — Languages
- **m_user_agents** — User Agents
- **m_asns** — ASNs
- **m_team** — Teams
- **m_hashtag** — Hashtags
- **m_mention** — Mentions
- **m_social_media_profiles** — Social Media Profiles
- **m_currencies** — Currencies
- **m_crypto_address** — Crypto Addresses
- **m_xmpp_addresses** — XMPP Addresses
- **m_enterprise_attack_tactics** — Enterprise ATT&CK Tactics
- **m_enterprise_attack_techniques** — Enterprise ATT&CK Techniques
- **m_document_id** — Document IDs
- **m_au_abn** — Australian IDs
- **m_us_passport** — US IDs
- **m_us_bank_number** — US Bank Numbers
- **m_platform** — Platform
- **m_author** — Author
- **m_industry** — Industry
- **m_scrap_file** — Scrap Script
