import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-json-validator-middleware';


// @https://simonplend.com/how-to-handle-request-validation-in-your-express-api/
function validationErrorMiddleware(error: Error, request:Request, response:Response, next:NextFunction) {

	if (response.headersSent) {
		return next(error);
	}

	const isValidationError = error instanceof ValidationError;
	if (!isValidationError) {
		return next(error);
	}

	response.status(400).json({
		errors: error.validationErrors,
	});

	next();
}


export default validationErrorMiddleware;
