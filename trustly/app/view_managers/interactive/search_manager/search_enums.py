import enum


class SEARCH_MODEL_COMMANDS(enum.Enum):
  M_INIT = 1
  M_FETCH_RESULT = 2


class USER_INDEX_MODEL_COMMANDS(enum.Enum):
  M_INIT = 1
  M_FETCH_RESULT = 2


class SEARCH_SESSION_COMMANDS(enum.Enum):
  M_INIT = 1
  INIT_SEARCH_PARAMETER = 2


class SEARCH_PARAM:
  M_QUERY = "q"
  M_TYPE = "pSearchParamType"
  M_PAGE = "mSearchParamPage"
  M_SAFE_SEARCH = "mSearchParamSafeSearch"
  M_NETWORK = "mNetwork"


class SEARCH_CALLBACK:
  M_URL_DISPLAY_TYPE = "mUrlDisplayType"
  M_QUERY = "mSearchCallbackQuery"
  M_DOCUMENT = "mSearchCallbackRelevantDocument"
  M_TITLE = "mSearchCallbackRelevantDocumentTitle"
  M_URL = "mSearchCallbackRelevantDocumentURL"
  M_SECTION = "mSection"
  M_DESCRIPTION = "mSearchCallbackRelevantDocumentDescription"
  K_SEARCH_TYPE = "mSearchCallbackRelevantSearchType"
  K_CONTENT_TYPE = "mContentType"
  M_MAX_PAGINATION = "mSearchCallbackMaxPagination"
  M_QUERY_ERROR = "mSearchCallbackQueryError"
  M_QUERY_ERROR_URL = "mSearchCallbackQueryErrorURL"
  M_PAGE_NUM = "mSearchCallbackPageNumber"
  M_SAFE_SEARCH = "mSearchCallbackSaveSearch"
  M_CURRENT_PAGE_NUM = "mSearchCallbackCurrentPageNumber"
  M_RESULT_COUNT = "mSearchCallbackResultCount"
  M_RELATED_BUSINESS_SITES = "mSearchCallbackRelevantBusiness"
  M_RELATED_NEWS_SITES = "mSearchCallbackRelevantDocumentNews"
  M_RELATED_FILES = "mSearchCallbackRelevantDocumentFiles"
  M_SECURE_SERVICE_NOTICE = "mUseSecureServiceNotice"
  M_HATE_QUERY = "mSearchCallHateQuery"
  M_UPDATE_DATA = "mUpdateDate"
  M_CREATION_DATA = "mCreationDate"
  M_WEBLINK = "mWebLink"
  M_EXTRALINK = "mExtraLink"
  M_DUMPLINK = "mDumpLink"
  M_CONTACT_LINK = "mContactLink"
  M_EXPIRY = "mExpiry"
  M_MORE_ID = "mMoreID"
  M_FULL_CONTENT = "mContent"
  M_DOCUMENT_LEAK = "mDocumentLeak"
  M_VIDEO = "mVideo"
  M_ARCHIVE_URL = "mArchiveUrl"
  M_NAME = "mName"
  M_EMAILS = "mEmails"
  M_PHONE_NUMBER = "mPhoneNumber"
  M_CONTENT = "mSearchContent"


class SEARCH_DOCUMENT_CALLBACK:
  M_TITLE = "m_title"
  M_HOST = "m_base_url"
  M_SUB_HOST = "m_url"
  M_IMPORTANT_DESCRIPTION = "m_important_content"
  M_CONTENT_TYPE = "m_content_type"
  M_CONTENT = "m_content"
  M_IMAGE = "m_images"
  M_SECTION = "m_section"
  M_DOCUMENT = "m_doc_url"


class SEARCH_MODEL_TOKENIZATION_COMMANDS(enum.Enum):
  M_NORMALIZE = 1
  M_SPLIT_AND_NORMALIZE = 2
