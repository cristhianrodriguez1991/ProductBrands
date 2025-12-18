import crypto from "crypto"
import axios from "axios"

const {
  AMAZON_PAAPI_ACCESS_KEY,
  AMAZON_PAAPI_SECRET_KEY,
  AMAZON_PAAPI_PARTNER_TAG,
  AMAZON_PAAPI_REGION,
  AMAZON_MARKETPLACE,
} = process.env

type PaapiItem = any // We intentionally keep this loose; shape is mapped downstream

function getSignatureKey(key: string, date: string, region: string, service: string) {
  const kDate = crypto.createHmac("sha256", `AWS4${key}`).update(date).digest()
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest()
  const kService = crypto.createHmac("sha256", kRegion).update(service).digest()
  return crypto.createHmac("sha256", kService).update("aws4_request").digest()
}

export async function getItems(asins: string[]): Promise<PaapiItem[]> {
  if (
    !AMAZON_PAAPI_ACCESS_KEY ||
    !AMAZON_PAAPI_SECRET_KEY ||
    !AMAZON_PAAPI_PARTNER_TAG ||
    !AMAZON_PAAPI_REGION ||
    !AMAZON_MARKETPLACE
  ) {
    throw new Error("Amazon PA-API environment variables are not fully configured")
  }

  if (asins.length === 0) return []

  const payload = {
    ItemIds: asins,
    Resources: [
      "Images.Primary.Large",
      "ItemInfo.Title",
      "ItemInfo.Features",
      "Offers.Listings.Price",
      "CustomerReviews.Count",
      "CustomerReviews.StarRating",
    ],
    PartnerTag: AMAZON_PAAPI_PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: AMAZON_MARKETPLACE,
  }

  const body = JSON.stringify(payload)
  const host = "webservices.amazon.com"
  const uri = "/paapi5/getitems"
  const time = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "")
  const date = time.slice(0, 8)

  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${host}\n` +
    `x-amz-date:${time}\n`

  const signedHeaders = "content-encoding;content-type;host;x-amz-date"

  const hashedPayload = crypto.createHash("sha256").update(body).digest("hex")

  const canonicalRequest = `POST\n${uri}\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`

  const stringToSign =
    `AWS4-HMAC-SHA256\n${time}\n${date}/${AMAZON_PAAPI_REGION}/ProductAdvertisingAPI/aws4_request\n` +
    crypto.createHash("sha256").update(canonicalRequest).digest("hex")

  const signingKey = getSignatureKey(
    AMAZON_PAAPI_SECRET_KEY,
    date,
    AMAZON_PAAPI_REGION,
    "ProductAdvertisingAPI"
  )

  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex")

  const authorization = `AWS4-HMAC-SHA256 Credential=${AMAZON_PAAPI_ACCESS_KEY}/${date}/${AMAZON_PAAPI_REGION}/ProductAdvertisingAPI/aws4_request, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await axios.post(`https://${host}${uri}`, body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "amz-1.0",
      "X-Amz-Date": time,
      Authorization: authorization,
    },
  })

  return res.data.ItemsResult?.Items ?? []
}


