import enum


class mongo_index_collection:
    M_URL = "m_url"
    M_CONTENT_TYPE = "m_content_type"

class MONGODB_COLLECTIONS:
    S_INDEX_MODEL = 'index_model'
    S_BACKUP_MODEL = 'backup_model'
    S_TFIDF_MODEL = 'tfidf_model'
    S_REPORT = 'reported_websites'
    S_SUBMIT = 'submitted_websites'

class MONGODB_KEYS:
    S_DOCUMENT = 'm_document'
    S_FILTER = 'm_filter'
    S_VALUE = 'm_value'

class MONGODB_CRUD_COMMANDS(enum.Enum):
    S_CREATE = '1'
    S_READ = '2'
    S_UPDATE = '3'
    S_DELETE = '4'
    S_REPLACE = '5'
    S_AGREGATE = '6'

class MANAGE_USER_MESSAGES:
    S_INSERT_FAILURE = "[1] Something unexpected happened while inserting"
    S_INSERT_SUCCESS = "[2] Document Created Successfully"
    S_UPDATE_FAILURE = "[3] Something unexpected happened while inserting"
    S_UPDATE_SUCCESS = "[4] Data Updated Successfully"
    S_DELETE_FAILURE = "[5] Something unexpected happened while deleting"
    S_DELETE_SUCCESS = "[6] Data Deleted Successfully"
    S_READ_FAILURE = "[5] Something unexpected happened while reading"
    S_READ_SUCCESS = "[6] Data Read Successfully"
