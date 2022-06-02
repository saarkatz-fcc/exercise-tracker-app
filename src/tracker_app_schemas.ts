import { JSONSchema7 } from 'json-schema';

const create_user_schema = {
    type: "object",
    required: ["username"],
    properties: { username: { type: "string", minLength: 1 } }
} as JSONSchema7;

const create_exercise_schema = {
    type: "object",
    required: ["description", "duration"],
    properties: {
        description: { type: "string", minLength: 1},
        duration: { type: "string", pattern: "[0-9]+" },
        date: { type: "string" }
    }
} as JSONSchema7;

export { create_user_schema, create_exercise_schema };
