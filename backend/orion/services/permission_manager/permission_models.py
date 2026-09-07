from enum import Enum


class UserPermission(str, Enum):
    CASE_MANAGEMENT = "case_management"
    ORION_MAIL = "orion_mail"
    DISMISS_RESULT = "dismiss_result"
