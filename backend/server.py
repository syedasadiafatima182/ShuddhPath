import sys
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

# Import your lambda_handler
from lambda_handler import lambda_handler

class RequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'OPTIONS,POST,GET')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')

        # Forward raw body directly so lambda_handler parses all keys (start, end, simulateRain)
        event = {
            'httpMethod': 'POST',
            'body': post_data,
            'requestContext': {'http': {'method': 'POST'}}
        }

        result = lambda_handler(event, None)

        self.send_response(result.get('statusCode', 200))
        for key, value in result.get('headers', {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(result['body'].encode('utf-8'))

if __name__ == '__main__':
    port = 8000
    server = HTTPServer(('127.0.0.1', port), RequestHandler)
    print(f"API bridge live on http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()