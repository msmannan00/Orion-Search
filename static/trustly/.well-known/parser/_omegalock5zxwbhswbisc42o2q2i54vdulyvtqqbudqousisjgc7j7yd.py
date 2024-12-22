import re
from abc import ABC
from typing import List, Set, Tuple
from urllib.parse import urljoin
from bs4 import BeautifulSoup

from crawler.crawler_instance.local_interface_model.leak_extractor_interface import leak_extractor_interface
from crawler.crawler_instance.local_shared_model.card_extraction_model import card_extraction_model
from crawler.crawler_instance.local_shared_model.leak_data_model import leak_data_model
from crawler.crawler_instance.local_shared_model.rule_model import RuleModel, FetchProxy, FetchConfig


class omegalock5zxwbhswbisc42o2q2i54vdulyvtqqbudqousisjgc7j7yd(leak_extractor_interface, ABC):
    def __init__(self):
        self.soup = None

    @property
    def base_url(self) -> str:
        return "http://omegalock5zxwbhswbisc42o2q2i54vdulyvtqqbudqousisjgc7j7yd.onion/"

    @property
    def rule_config(self) -> RuleModel:
        return RuleModel(m_fetch_proxy=FetchProxy.TOR, m_fetch_config=FetchConfig.SELENIUM)

    @staticmethod
    def clean_text(text: str) -> str:
        return " ".join(text.split()).strip()

    def parse_leak_data(self, html_content: str, p_data_url: str) -> Tuple[leak_data_model, Set[str]]:
        self.soup = BeautifulSoup(html_content, 'html.parser')

        sub_links = []

        table_rows = self.soup.find_all('tr', class_='trow')
        cards = []

        for row in table_rows:
            columns = row.find_all('td')
            if len(columns) == 6:
                title = columns[0].get_text(strip=True)
                leaked = columns[1].get_text(strip=True)
                tags = columns[2].get_text(strip=True)
                total_size = columns[3].get_text(strip=True)
                last_updated = columns[4].get_text(strip=True)
                download_link = urljoin(self.base_url, columns[5].find('a')['href'])

                card = card_extraction_model(
                    m_leak_date=last_updated,
                    m_title=title,
                    m_url=download_link,
                    m_base_url=self.base_url,
                    m_content=f"Leaked: {leaked}, Tags: {tags}, Total Size: {total_size}",
                    m_important_content=f"Leaked: {leaked}, Tags: {tags}, Total Size: {total_size}",
                    m_weblink=[],
                    m_dumplink=[download_link],
                    m_extra_tags=tags,
                    m_content_type="general"
                )
                cards.append(card)

        data_model = leak_data_model(
            cards_data=cards,
            contact_link=self.contact_page(),
            base_url=p_data_url,
            content_type=["leak"]
        )

        return data_model, set(sub_links)

    def extract_links_from_class(self, tag: str, class_name: str) -> List[str]:
        elements = self.soup.find_all(tag, class_=class_name)
        links = []
        for element in elements:
            if tag == 'a':
                href = element.get('href')
                if href:
                    links.append(urljoin(self.base_url, href))
            else:
                links.extend(
                    urljoin(self.base_url, a['href']) for a in element.find_all('a', href=True)
                )
        return links

    def contact_page(self) -> str:
        return urljoin(self.base_url, "http://omegalock5zxwbhswbisc42o2q2i54vdulyvtqqbudqousisjgc7j7yd.onion")
