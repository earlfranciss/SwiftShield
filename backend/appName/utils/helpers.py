from datetime import datetime

def time_ago(scan_time):
    now = datetime.now()
    diff = now - scan_time

    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "Just now"
    elif seconds < 120:
        return f"{int(seconds / 60)} min ago"
    elif seconds < 3600:
        return f"{int(seconds / 60)} mins ago"
    elif seconds < 7200:
        return f"{int(seconds / 3600)} hour ago"
    elif seconds < 86400:
        return f"{int(seconds / 3600)} hours ago"
    elif seconds < 172800:
        return f"{int(seconds / 86400)} day ago"
    elif seconds < 604800:
        return f"{int(seconds / 86400)} days ago"
    elif seconds < 1209600:
        return f"{int(seconds / 604800)} week ago"
    elif seconds < 2592000:
        return f"{int(seconds / 604800)} weeks ago"
    elif seconds < 5184000:
        return f"{int(seconds / 2592000)} month ago"
    elif seconds < 31557600:
        return f"{int(seconds / 2592000)} months ago"
    elif seconds < 63115200:
        return f"{int(seconds / 31557600)} year ago"
    else:
        return f"{int(seconds / 31557600)} years ago"

