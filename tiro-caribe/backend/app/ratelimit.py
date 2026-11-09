import time
from collections import defaultdict, deque

WINDOW_SECONDS = 60
MAX_REQUESTS = 5

_hits = defaultdict(deque)


def allow(key):
    now = time.monotonic()
    queue = _hits[key]
    while queue and now - queue[0] > WINDOW_SECONDS:
        queue.popleft()
    if len(queue) >= MAX_REQUESTS:
        return False
    queue.append(now)
    return True