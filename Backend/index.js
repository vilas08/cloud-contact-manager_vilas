const crypto = require("node:crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    ScanCommand,
    GetCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

const response = (statusCode, data) => ({
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
});

exports.handler = async (event) => {
    try {
        if (!TABLE_NAME) throw new Error("TABLE_NAME environment variable is missing");

        const method = event.requestContext?.http?.method;
        const path = event.rawPath || "/";
        const id = path.match(/^\/contacts\/([^/]+)\/?$/)?.[1];

        // OPTIONS preflight is answered by API Gateway CORS, not here.

        // GET /contacts  -> list all
        if (method === "GET" && path === "/contacts") {
            const result = await db.send(new ScanCommand({ TableName: TABLE_NAME }));
            return response(200, { contacts: result.Items || [] });
        }

        // POST /contacts -> create
        if (method === "POST" && path === "/contacts") {
            const body = JSON.parse(event.body || "{}");
            const name = body.name?.trim();
            const email = body.email?.trim();
            if (!name || !email) {
                return response(400, { message: "Name and email are required" });
            }
            const contact = {
                id: crypto.randomUUID(),
                name,
                email,
                createdAt: new Date().toISOString(),
            };
            await db.send(new PutCommand({ TableName: TABLE_NAME, Item: contact }));
            return response(201, { message: "Contact created", contact });
        }

        // GET /contacts/{id} -> read one
        if (method === "GET" && id) {
            const result = await db.send(
                new GetCommand({ TableName: TABLE_NAME, Key: { id } })
            );
            if (!result.Item) return response(404, { message: "Contact not found" });
            return response(200, { contact: result.Item });
        }

        // PUT /contacts/{id} -> update
        if (method === "PUT" && id) {
            const body = JSON.parse(event.body || "{}");
            const name = body.name?.trim();
            const email = body.email?.trim();
            if (!name || !email) {
                return response(400, { message: "Name and email are required" });
            }
            const result = await db.send(
                new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { id },
                    UpdateExpression: "SET #n = :name, #e = :email",
                    ExpressionAttributeNames: { "#n": "name", "#e": "email" },
                    ExpressionAttributeValues: { ":name": name, ":email": email },
                    ConditionExpression: "attribute_exists(id)",
                    ReturnValues: "ALL_NEW",
                })
            );
            return response(200, { message: "Contact updated", contact: result.Attributes });
        }

        // DELETE /contacts/{id} -> delete
        if (method === "DELETE" && id) {
            await db.send(
                new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: { id },
                    ConditionExpression: "attribute_exists(id)",
                })
            );
            return response(200, { message: "Contact deleted" });
        }

        return response(404, { message: "Route not found" });
    } catch (error) {
        if (error.name === "ConditionalCheckFailedException") {
            return response(404, { message: "Contact not found" });
        }
        if (error instanceof SyntaxError) {
            return response(400, { message: "Invalid JSON body" });
        }
        console.error("Backend error:", error);
        return response(500, { message: "Internal server error" });
    }
};