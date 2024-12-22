from abc import ABC
from typing import Tuple, Set
import  re
from crawler.crawler_instance.local_interface_model.leak_extractor_interface import leak_extractor_interface
from crawler.crawler_instance.local_shared_model.card_extraction_model import card_extraction_model
from crawler.crawler_instance.local_shared_model.leak_data_model import leak_data_model
from crawler.crawler_instance.local_shared_model.rule_model import RuleModel, FetchProxy, FetchConfig
import html

class _3ev4metjirohtdpshsqlkrqcmxq6zu3d7obrdhglpy5jpbr7whmlfgqd(leak_extractor_interface, ABC):
    def __init__(self):
        self.soup = None

    @property
    def base_url(self) -> str:
        return "http://3ev4metjirohtdpshsqlkrqcmxq6zu3d7obrdhglpy5jpbr7whmlfgqd.onion"

    @property
    def rule_config(self) -> RuleModel:
        return RuleModel(m_fetch_proxy=FetchProxy.TOR, m_fetch_config=FetchConfig.SELENIUM)

    @staticmethod
    def clean_data(raw_text: str) -> str:
        cleaned_text = html.unescape(raw_text)
        cleaned_text = re.sub(r'<[^>]*>', '', cleaned_text)  # Remove HTML tags
        cleaned_text = re.sub(r'\s*\+\s*', '', cleaned_text)  # Remove concatenation
        cleaned_text = re.sub(r"['\"]", '', cleaned_text)  # Remove single and double quotes
        cleaned_text = re.sub(r'\n', ' ', cleaned_text)  # Replace newlines with space
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text)  # Collapse multiple spaces into one
        return cleaned_text.strip()

    def parse_leak_data(self, html_content: str, p_data_url: str) -> Tuple['leak_data_model', Set[str]]:
        sub_links = set()
        entry_pattern = r'\{\s*title\s*:\s*([^,]+),\s*short\s*:\s*([^,]+),\s*full\s*:\s*(.+?),\s*links\s*:\s*\[([^\]]*)\]\s*\}'
        cards = []
        html_content = self.clean_data(html_content)
        entries = re.findall(entry_pattern, html_content, re.DOTALL)

        for entry in entries:
            title = entry[0].strip() if len(entry) > 0 else "Unknown Title"
            short_description = entry[1].strip() if len(entry) > 1 else "Unknown Description"
            full_content = entry[2].replace("Link â„–1 Filelist", "").replace("<br>", "\n").replace("'+", "").strip() if len(entry) > 2 else "Unknown Content"
            full_content = short_description + ". " + full_content
            links_raw = entry[3].strip() if len(entry) > 3 else ""
            links = [link.strip().strip('"') for link in links_raw.split(",") if link.strip()]
            card = card_extraction_model(m_leak_date="N/A",  # Leak date not available in this JSON structure
                m_title=title, m_url=p_data_url, m_base_url=p_data_url, m_content=f"{full_content}", m_important_content=full_content, m_weblink=[], m_dumplink=links, m_extra_tags=[""], m_content_type="general")
            cards.append(card)

        data_model = leak_data_model(cards_data=cards, contact_link=self.contact_page(), base_url=p_data_url, content_type=["leak"])

        return data_model, sub_links

    def contact_page(self) -> str:
        return "http://3ev4metjirohtdpshsqlkrqcmxq6zu3d7obrdhglpy5jpbr7whmlfgqd.onion"
