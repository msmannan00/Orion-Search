import re
from abc import ABC
from typing import List, Set, Tuple
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from crawler.crawler_instance.local_interface_model.leak_extractor_interface import leak_extractor_interface
from crawler.crawler_instance.local_shared_model.card_extraction_model import card_extraction_model
from crawler.crawler_instance.local_shared_model.leak_data_model import leak_data_model
from crawler.crawler_instance.local_shared_model.rule_model import RuleModel, FetchProxy, FetchConfig

class ddosecrets(leak_extractor_interface, ABC):
    def __init__(self):
        self.soup = None

    @property
    def base_url(self) -> str:
        return "https://ddosecrets.com"

    @property
    def rule_config(self) -> RuleModel:
        return RuleModel(m_sub_url_length=10000, m_fetch_proxy=FetchProxy.NONE, m_fetch_config = FetchConfig.SELENIUM)

    @staticmethod
    def clean_text(text: str) -> str:
        return " ".join(text.split()).strip()

    def parse_leak_data(self, html_content: str, p_data_url: str) -> Tuple[leak_data_model, Set[str]]:
        self.soup = BeautifulSoup(html_content, 'html.parser')

        data_model = None
        sub_links = []
        if "/article/" in p_data_url:
            cards = self.extract_cards('content', p_data_url)
            data_model = leak_data_model(
                cards_data=cards,
                contact_link=self.contact_page(),
                base_url=p_data_url,
                content_type=["leak"]
            )
        else:
            all_categories_links = self.extract_links(html_content)
            sub_links = list(set(all_categories_links))

        return data_model, set(sub_links)

    def extract_links(self, html_content: str) -> List[str]:
        from bs4 import BeautifulSoup
        from urllib.parse import urljoin

        # Parse the HTML content
        soup = BeautifulSoup(html_content, 'html.parser')
        links = []

        # Find all anchor tags with href attributes
        for a in soup.find_all('a', href=True):
            href = a['href']
            if 'article/' in href:
                # Prepend base URL if necessary
                full_link = urljoin(self.base_url, href) if not href.startswith(self.base_url) else href
                links.append(full_link)

        return links

    def extract_cards(self, container_class: str, url: str) -> List[card_extraction_model]:
        container = self.soup.find_all(lambda tag: tag.has_attr('class') and tag['class'] == [container_class])
        new_cards_data = []

        for card in container:
            title = card.find('h1').get_text(strip=True) if card.find('h1') else ""
            metadata = card.find(class_="metadata")
            leakdate = card.find(class_="meta")
            article_content = ""
            if card.find(class_="article-content"):
                article_content = re.sub(r'[\n\r]+', '', card.find(class_="article-content").text)

            metadata_dict = {}
            if metadata:
                for p in metadata.find_all('p'):
                    label_element = p.find('span', class_='label')
                    link_element = p.find('a', href=True)

                    if label_element:
                        label_text = label_element.get_text(strip=True).replace(":", "")

                        if link_element:
                            link_href = urljoin(self.base_url, link_element['href'])
                            metadata_dict[label_text] = f"{link_href}"
                        else:
                            metadata_dict[label_text] = p.get_text(strip=True).replace(label_element.get_text(strip=True), "").strip()

            source_url = metadata_dict.get("Source", "")
            download_link = metadata_dict.get("Download", "")
            magnet_link = metadata_dict.get("Magnet", "")
            torrent_link = metadata_dict.get("Torrent", "")
            external_link = metadata_dict.get("External Collaboration Link", "")

            card_data = card_extraction_model(
                m_leak_date = leakdate.text.replace("Published on ",""),
                m_title=title,
                m_url=url,
                m_base_url=self.base_url,
                m_content=article_content,
                m_important_content=article_content,
                m_weblink=[source_url],
                m_dumplink=[download_link, magnet_link, torrent_link],
                m_extra_tags=external_link,
                m_content_type="general"
            )
            new_cards_data.append(card_data)

        return new_cards_data

    def contact_page(self) -> str:
        return urljoin(self.base_url, "/?contact")
