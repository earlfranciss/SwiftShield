from datetime import datetime

def time_ago(scan_time):
    now = datetime.now()
    diff = now - scan_time

    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "Just now"
    elif seconds < 3600:
        return f"{int(seconds / 60)} mins ago"
    elif seconds < 86400:
        return f"{int(seconds / 3600)} hours ago"
    elif seconds < 604800:
        return f"{int(seconds / 86400)} days ago"
    elif seconds < 2592000:  # Approximate 30 days
        return f"{int(seconds / 604800)} weeks ago"
    elif seconds < 31536000:  # Approximate 12 months
        return f"{int(seconds / 2592000)} months ago"
    else:
        return f"{int(seconds / 31536000)} years ago"

