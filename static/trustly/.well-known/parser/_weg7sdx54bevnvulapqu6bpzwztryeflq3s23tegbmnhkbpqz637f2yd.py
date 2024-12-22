import re
from abc import ABC
from typing import List, Set, Tuple
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from crawler.crawler_instance.local_interface_model.leak_extractor_interface import leak_extractor_interface
from crawler.crawler_instance.local_shared_model.card_extraction_model import card_extraction_model
from crawler.crawler_instance.local_shared_model.leak_data_model import leak_data_model
from crawler.crawler_instance.local_shared_model.rule_model import RuleModel, FetchProxy, FetchConfig

class weg7sdx54bevnvulapqu6bpzwztryeflq3s23tegbmnhkbpqz637f2yd(leak_extractor_interface, ABC):
    _instance = None

    def __init__(self):
        self.soup = None
        self._initialized = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(weg7sdx54bevnvulapqu6bpzwztryeflq3s23tegbmnhkbpqz637f2yd, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    @property
    def base_url(self) -> str:
        return "http://weg7sdx54bevnvulapqu6bpzwztryeflq3s23tegbmnhkbpqz637f2yd.onion"

    @property
    def rule_config(self) -> RuleModel:
        return RuleModel(m_fetch_proxy=FetchProxy.TOR, m_fetch_config = FetchConfig.SELENIUM)

    @staticmethod
    def clean_text(text: str) -> str:
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        return text

    def parse_leak_data(self, html_content: str, p_data_url: str) -> Tuple[leak_data_model, Set[str]]:
        try:
            self.soup = BeautifulSoup(html_content, 'html.parser')
            cards_data = self.extract_cards(p_data_url)
            sub_links = self.extract_sub_links()
            self._initialized = True
        except Exception as e:
            print(f"Error parsing leak data: {e}")
            cards_data = []
            sub_links = set()

        data_model = leak_data_model(
            cards_data=cards_data,
            contact_link=self.contact_page(),
            base_url=p_data_url,
            content_type=["leak"]
        )

        return data_model, sub_links

    def extract_cards(self, url: str) -> List[card_extraction_model]:
        cards = self.soup.find_all(class_="card")
        new_cards_data: List[card_extraction_model] = []

        for card in cards:
            title = card.find(class_="title")
            text_elements = card.find_all(class_="text")
            link_elements = card.find_all(class_="links")
            extra_tags = [self.clean_text(tag.get_text(strip=True)) for tag in card.find_all(class_="extra")]

            title_text = self.clean_text(title.get_text(strip=True)) if title else ""
            content = ' '.join(self.clean_text(text.get_text(strip=True)) for text in text_elements if text)
            weblinks = [urljoin(self.base_url, title.a['href'])] if title and title.a else []
            dumplinks = [urljoin(self.base_url, link.a['href']) for link in link_elements if link and link.a]

            card_data = card_extraction_model(
                m_title=title_text,
                m_url=url,
                m_base_url=self.base_url,
                m_content=content,
                m_important_content=content,
                m_weblink=weblinks,
                m_dumplink=dumplinks,
                m_extra_tags=extra_tags,
                m_content_type = "general"
            )
            new_cards_data.append(card_data)

        return new_cards_data

    def extract_sub_links(self) -> Set[str]:
        pagination_section = self.soup.find(class_="pagination")
        new_sub_links: Set[str] = set()

        if pagination_section:
            links = pagination_section.find_all('a', href=True)
            for link in links:
                full_link = urljoin(self.base_url, link['href'])
                new_sub_links.add(full_link)

        return new_sub_links

    def contact_page(self) -> str:
        return urljoin(self.base_url, "/?contact")
