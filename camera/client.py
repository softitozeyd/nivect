"""Session/CSRF authenticated delivery using standard-library HTTP and durable retries."""
import http.cookiejar
import json
import urllib.request
from urllib.parse import urlencode, urlparse

class Backend:
    def __init__(self, base, password, username='camera'):
        parsed=urlparse(base)
        if parsed.scheme!='https' and parsed.hostname not in ('localhost','127.0.0.1'):
            raise ValueError('Remote backends require HTTPS')
        self.base=base.rstrip('/')
        self.http=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.password=password
        self.username=username
        self.csrf=None

    def call(self,path,data=None,content_type='application/json'):
        headers={}
        if data is not None:
            headers['Content-Type']=content_type
            headers[self.csrf['headerName']]=self.csrf['token']
        with self.http.open(urllib.request.Request(self.base+path,data=data,headers=headers),timeout=15) as r:
            raw=r.read()
            return json.loads(raw) if raw and 'json' in r.headers.get('Content-Type','') else raw

    def login(self):
        self.csrf=self.call('/api/auth/csrf')
        self.call('/api/auth/login',urlencode(dict(username=self.username,password=self.password)).encode(),
                  'application/x-www-form-urlencoded')
        self.csrf=self.call('/api/auth/csrf')

    def deliver(self,outbox):
        for event in outbox.pending():
            result=self.call('/api/v1/inspections',json.dumps(event).encode())
            if result['eventId']!=event['eventId']:
                raise ValueError('Application ACK does not match event')
            outbox.acknowledge(event['eventId'])
