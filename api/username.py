"""نرمال‌سازی و اعتبارسنجی نام کاربری ورود."""
import re

PERSIAN_DIGIT_TRANSLATION = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')

USERNAME_MIN_LEN = 3
USERNAME_MAX_LEN = 150
USERNAME_RE = re.compile(r'^[A-Za-z0-9@._+\-!#$%&*?=~]+$')


def normalize_username(value):
    if value is None:
        return ''
    return str(value).translate(PERSIAN_DIGIT_TRANSLATION).strip()


def validate_username(value):
    """
    نام کاربری می‌تواند شماره موبایل یا ترکیبی از حروف انگلیسی،
    عدد و علامت‌های خاص باشد.
    """
    username = normalize_username(value)
    if not username:
        raise ValueError('نام کاربری الزامی است')
    if len(username) < USERNAME_MIN_LEN:
        raise ValueError(f'نام کاربری باید حداقل {USERNAME_MIN_LEN} کاراکتر باشد')
    if len(username) > USERNAME_MAX_LEN:
        raise ValueError(f'نام کاربری نباید بیشتر از {USERNAME_MAX_LEN} کاراکتر باشد')
    if not USERNAME_RE.match(username):
        raise ValueError(
            'نام کاربری فقط می‌تواند شامل حروف انگلیسی، عدد و علامت‌های خاص '
            '(@ . _ - + ! # $ % & * ? = ~) باشد'
        )
    return username
