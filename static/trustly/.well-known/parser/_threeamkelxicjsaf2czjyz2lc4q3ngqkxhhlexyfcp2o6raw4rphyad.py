from abc import ABC
from typing import Tuple, List, Set
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from crawler.crawler_instance.local_interface_model.leak_extractor_interface import leak_extractor_interface
from crawler.crawler_instance.local_shared_model.card_extraction_model import card_extraction_model
from crawler.crawler_instance.local_shared_model.leak_data_model import leak_data_model
from crawler.crawler_instance.local_shared_model.rule_model import RuleModel, FetchProxy, FetchConfig
import re


class threeamkelxicjsaf2czjyz2lc4q3ngqkxhhlexyfcp2o6raw4rphyad(leak_extractor_interface, ABC):
  def __init__(self):
    self.soup = None

  @property
  def base_url(self) -> str:
    return "http://threeamkelxicjsaf2czjyz2lc4q3ngqkxhhlexyfcp2o6raw4rphyad.onion/"

  @property
  def rule_config(self) -> RuleModel:
    return RuleModel(m_fetch_proxy=FetchProxy.TOR, m_fetch_config=FetchConfig.SELENIUM)

  @staticmethod
  def clean_text(text: str) -> str:
    return " ".join(text.split()).strip()

  def parse_leak_data(self, html_content: str, p_data_url: str) -> Tuple[leak_data_model, Set[str]]:
    self.soup = BeautifulSoup(html_content, 'html.parser')

    sub_links = self.extract_links_from_class(html_content)
    cards = []

    if "post.php?id" in p_data_url:
        header = self.soup.find('header', class_='bord-header')
        title = header.find('h2').get_text(strip=True) if header else "Unknown Title"

        full_bord = self.soup.find('div', class_='full-bord')
        content = full_bord.find('p').get_text(strip=True) if full_bord else "Unknown Content"

        timestamp_post = self.soup.find('span', id='timestampPost')
        leak_date = timestamp_post.get_text(strip=True) if timestamp_post else "Unknown Date"

        file_table = self.soup.find('div', class_='container-fluid bord full-browser mb-4')
        file_rows = file_table.find_all('tr', class_='noselect') if file_table else []

        dump_links = []
        for row in file_rows:
            columns = row.find_all('td')
            if len(columns) == 3:
                file_name_link = columns[0].find('a')
                file_url = file_name_link['onclick'].split("'")[1] if file_name_link and 'onclick' in file_name_link.attrs else "Unknown URL"
                dump_links.append(file_url)

        card = card_extraction_model(m_leak_date=leak_date, m_title=title, m_url=self.base_url, m_base_url=self.base_url, m_content=content, m_important_content=content, m_weblink=[], m_dumplink=dump_links, m_extra_tags="", m_content_type="general")
        cards.append(card)

    data_model = leak_data_model(cards_data=cards, contact_link=self.contact_page(), base_url=p_data_url, content_type=["leak"])

    return data_model, set(sub_links)

  def extract_links_from_class(self, html_content: str = None) -> List[str]:
    if html_content:
      self.soup = BeautifulSoup(html_content, 'html.parser')

    container = self.soup.find('div', class_='post-bottom')
    if not container:
      return []

    first_element = container.find('a', class_='post-more-link')
    if not first_element:
      return []

    onclick_attr = first_element.get('onclick')
    if not onclick_attr:
      return []

    id_match = re.search(r"id=(\d+)", onclick_attr)
    if not id_match:
      return []

    max_id = int(id_match.group(1))

    return [urljoin(self.base_url, f"post.php?id={i}") for i in range(max_id + 1)]

  def contact_page(self) -> str:
    contact_link = self.soup.find('a', text='clearnet')
    if contact_link:
      return urljoin(self.base_url, contact_link['href'])
    return urljoin(self.base_url, "ThreeAM@onionmail.org")
