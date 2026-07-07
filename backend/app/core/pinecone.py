from pinecone import Pinecone
from app.core.config import settings


pc = Pinecone(api_key=settings.pinecone_key)

if not pc.has_index(settings.pinecone_index_name):
    pc.create_index_for_model(
        name=settings.pinecone_index_name,
        cloud=settings.pinecone_cloud ,
        region=settings.pinecone_region ,
        embed={
        "model":"llama-text-embed-v2"
    })


index = pc.Index(host=settings.pinecone_host)
