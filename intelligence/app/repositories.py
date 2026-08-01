from dataclasses import dataclass
from decimal import Decimal
from .database import connection


@dataclass(frozen=True)
class CommodityIdentity:
    slug: str
    name: str


class AgricultureRepository:
    async def list_commodities(self) -> list[CommodityIdentity]:
        async with connection() as db:
            rows = await db.fetch('SELECT "slug", "name" FROM "Commodity" ORDER BY "displayOrder", "name"')
        return [CommodityIdentity(slug=row["slug"], name=row["name"]) for row in rows]

    async def national_price(self, commodity_slug: str) -> dict | None:
        async with connection() as db:
            row = await db.fetchrow(
                """
                SELECT c."name", c."slug", cp."value", cp."changePercent", cp."unit",
                       cp."priceDate", cp."source"
                FROM "CommodityPrice" cp
                JOIN "Commodity" c ON c."id" = cp."commodityId"
                WHERE c."slug" = $1 AND cp."stateCode" = 'US'
                ORDER BY cp."priceDate" DESC
                LIMIT 1
                """,
                commodity_slug,
            )
        return self._record_to_dict(row)

    async def state_production(self, state_code: str) -> list[dict]:
        async with connection() as db:
            rows = await db.fetch(
                """
                SELECT DISTINCT ON (c."id") c."name", c."slug", c."color", c."category",
                       p."value", p."unit", p."year", p."source",
                       p."totalValueUsd", p."unitPriceUsd"
                FROM "ProductionRecord" p
                JOIN "Commodity" c ON c."id" = p."commodityId"
                WHERE p."stateCode" = $1 AND p."source" = 'USDA NASS Quick Stats'
                ORDER BY c."id", p."year" DESC
                """,
                state_code,
            )
        result = [self._record_to_dict(row) for row in rows]
        return sorted(
            result,
            key=lambda row: (
                row["category"] == "LIVESTOCK",
                -(row.get("totalValueUsd") or 0),
                -row["value"],
            ),
        )

    async def top_states(self, commodity_slug: str, limit: int = 5) -> list[dict]:
        async with connection() as db:
            year = await db.fetchval(
                """
                SELECT MAX(p."year")
                FROM "ProductionRecord" p
                JOIN "Commodity" c ON c."id" = p."commodityId"
                WHERE c."slug" = $1
                """,
                commodity_slug,
            )
            if year is None:
                return []
            rows = await db.fetch(
                """
                SELECT p."stateCode", p."value", p."unit", p."year", p."source"
                FROM "ProductionRecord" p
                JOIN "Commodity" c ON c."id" = p."commodityId"
                WHERE c."slug" = $1 AND p."year" = $2
                ORDER BY p."value" DESC
                LIMIT $3
                """,
                commodity_slug,
                year,
                limit,
            )
        return [self._record_to_dict(row) for row in rows]

    async def featured_prices(self) -> list[dict]:
        async with connection() as db:
            rows = await db.fetch(
                """
                SELECT DISTINCT ON (c."id") c."name", c."slug", cp."value", cp."changePercent",
                       cp."unit", cp."priceDate", cp."source"
                FROM "Commodity" c
                JOIN "CommodityPrice" cp ON cp."commodityId" = c."id"
                WHERE c."featured" = true AND cp."stateCode" = 'US'
                ORDER BY c."id", cp."priceDate" DESC
                """
            )
        return [self._record_to_dict(row) for row in rows]

    async def all_latest_prices(self) -> list[dict]:
        async with connection() as db:
            rows = await db.fetch(
                """
                SELECT DISTINCT ON (c."id") c."name", c."slug", c."category",
                       cp."value", cp."changePercent", cp."unit", cp."priceDate", cp."source"
                FROM "Commodity" c
                JOIN "CommodityPrice" cp ON cp."commodityId" = c."id"
                WHERE cp."stateCode" = 'US'
                ORDER BY c."id", cp."priceDate" DESC
                """
            )
        return [self._record_to_dict(row) for row in rows]

    async def nationwide_latest_production(self) -> list[dict]:
        async with connection() as db:
            rows = await db.fetch(
                """
                SELECT DISTINCT ON (p."stateCode", c."id")
                       p."stateCode", c."name", c."slug", c."category",
                       p."value", p."unit", p."year", p."plantedAcres", p."harvestedAcres",
                       p."yieldValue", p."totalValueUsd", p."unitPriceUsd", p."source"
                FROM "ProductionRecord" p
                JOIN "Commodity" c ON c."id" = p."commodityId"
                WHERE p."source" = 'USDA NASS Quick Stats'
                ORDER BY p."stateCode", c."id", p."year" DESC
                """
            )
        return [self._record_to_dict(row) for row in rows]

    @staticmethod
    def _record_to_dict(row) -> dict | None:
        if row is None:
            return None
        result = dict(row)
        for key, value in result.items():
            if isinstance(value, Decimal):
                result[key] = float(value)
            elif hasattr(value, "isoformat"):
                result[key] = value.isoformat()
        return result


agriculture_repository = AgricultureRepository()
