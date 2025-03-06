import boto3
import uuid
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')

products_table = dynamodb.Table('Products_DynamoDB')
stocks_table = dynamodb.Table('Stock_DynamoDB')

def add_product(title, description, price):
    product_id = str(uuid.uuid4())
    products_table.put_item(
        Item={
            'id': product_id,
            'title': title,
            'description': description,
            'price': Decimal(price)
        }
    )
    return product_id

def add_stock(product_id, count):
    stocks_table.put_item(
        Item={
            'product_id': product_id,
            'count': count
        }
    )

products = [
    {"title": "Laptop", "description": "A high performance laptop", "price": 1200},
    {"title": "Smartphone", "description": "A sleek and modern smartphone", "price": 800},
    {"title": "Headphones", "description": "Noise cancelling headphones", "price": 200},
    {"title": "Smart Watch", "description": "A stylish smart watch with fitness tracking", "price": 150},
    {"title": "Bluetooth Speaker", "description": "Portable Bluetooth speaker with great sound", "price": 50},
    {"title": "Coffee Maker", "description": "Automatic coffee maker with a built-in grinder", "price": 100},
    {"title": "Gaming Console", "description": "Next-generation gaming console with 4K support", "price": 500},
    {"title": "Electric Toothbrush", "description": "Electric toothbrush with smart features", "price": 80},
    {"title": "Drone", "description": "High-quality drone with 4K camera", "price": 300},
    {"title": "Smart TV", "description": "65-inch 4K Smart TV with HDR support", "price": 700},
    {"title": "Digital Camera", "description": "Compact digital camera with 20MP resolution", "price": 250},
    {"title": "Portable Charger", "description": "Power bank with fast charging capabilities", "price": 40},
    {"title": "Electric Kettle", "description": "Fast boiling electric kettle with temperature control", "price": 30},
    {"title": "Vacuum Cleaner", "description": "Cordless vacuum cleaner with strong suction", "price": 120},
    {"title": "Air Purifier", "description": "HEPA filter air purifier for cleaner air", "price": 150},
    {"title": "Robot Vacuum", "description": "Automatic robot vacuum cleaner for hassle-free cleaning", "price": 250},
    {"title": "Tablet", "description": "10-inch tablet with high resolution display", "price": 350},
    {"title": "Electric Bike", "description": "Electric bike with long battery life", "price": 800},
    {"title": "Game Controller", "description": "Wireless game controller for multiple platforms", "price": 60},
]

for product in products:
    product_id = add_product(product['title'], product['description'], product['price'])
    add_stock(product_id, 100)

print("Test data has been added to DynamoDB tables.")
