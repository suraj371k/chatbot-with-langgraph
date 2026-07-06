import boto3
from app.core.config import settings

s3 = boto3.client("s3")

s3.create_bucket(
    Bucket=settings.bucket_name,
)

