import { authMiddleware } from "@clerk/nextjs";
import { match } from "assert";
export default authMiddleware({
  publicRoutes: ["/", "/auth(.*)", "/portal(.*)", "/images(.*)"],
  ignoredRoutes: ["/chatbot"],
});
export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
