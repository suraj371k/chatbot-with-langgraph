import asyncio
from sqlalchemy import text
from app.core.database import engine

async def main():
    try:
        async with engine.begin() as conn:
            print('connected')
            await conn.execute(text('select 1'))
            print('query ok')
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
