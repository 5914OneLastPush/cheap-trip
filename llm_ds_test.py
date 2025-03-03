from openai import OpenAI
import sys
sys.stdout.reconfigure(encoding='utf-8')
client = OpenAI(api_key="sk-9262f4e5a89d4315a2bebf52f2d9ca5d", base_url="https://api.deepseek.com")

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": "Hello"},
    ],
    stream=False
)

print(response.choices[0].message.content)