import chromadb

chroma_client = chromadb.PersistentClient(path="./")

collection = chroma_client.get_or_create_collection(name="chatbot_documents")
