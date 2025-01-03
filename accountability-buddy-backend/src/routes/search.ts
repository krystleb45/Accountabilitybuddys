import express, { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware"; // Correct middleware import path
import searchController from "../controllers/SearchController"; // Corrected controller import path
import logger from "../utils/winstonLogger"; // Logger utility

const router = express.Router();

/**
 * Rate limiter to prevent abuse of search functionality.
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 search requests per minute
  message: "Too many search requests from this IP, please try again later.",
});

/**
 * Middleware to sanitize user input.
 */
const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);
    req.body = sanitize(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware for handling validation errors.
 */
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/**
 * Helper function to parse pagination parameters.
 */
const parsePagination = (query: Record<string, string | undefined>): { page: number; limit: number } => {
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(50, parseInt(query.limit || "10", 10)); // Limit results to a max of 50 per page
  return { page, limit };
};

/**
 * @route   GET /search
 * @desc    General search across resources
 * @access  Private (Logged-in users only)
 */
router.get(
  "/",
  authMiddleware,
  searchLimiter,
  [
    check("query", "Search query is required").notEmpty(),
    check("type", "Invalid search type").isIn(["user", "group", "goal", "task", "post"]),
  ],
  sanitizeInput,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    const { query, type } = req.query as { query: string; type: string };
    const { page, limit } = parsePagination(req.query);

    try {
      const results = await searchController.search(query, type, page, limit);
      res.status(200).json({ success: true, results });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unexpected error occurred";
      logger.error(`Error during search: ${errorMessage}`);
      res.status(500).json({ success: false, msg: "Server error", error: errorMessage });
    }
  }
);

/**
 * Common route handler factory for resource-specific searches.
 */
const createSearchRoute = (
  endpoint: string,
  searchFunction: (query: string, page: number, limit: number) => Promise<unknown>
): void => {
  router.get(
    endpoint,
    authMiddleware,
    searchLimiter,
    [check("query", "Search query is required").notEmpty()],
    sanitizeInput,
    handleValidationErrors,
    async (req: Request, res: Response): Promise<void> => {
      const { query } = req.query as { query: string };
      const { page, limit } = parsePagination(req.query);

      try {
        const results = await searchFunction(query, page, limit);
        res.status(200).json({ success: true, results });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unexpected error occurred";
        logger.error(`Error searching ${endpoint}: ${errorMessage}`);
        res.status(500).json({ success: false, msg: "Server error", error: errorMessage });
      }
    }
  );
};

// Resource-specific search routes
createSearchRoute("/users", searchController.searchUsers);
createSearchRoute("/groups", searchController.searchGroups);
createSearchRoute("/goals", searchController.searchGoals);
createSearchRoute("/posts", searchController.searchPosts);

export default router;