import { Router } from "express";
import { PlaygroundController } from "@/controllers";

const router: Router = Router();
const controller: PlaygroundController = new PlaygroundController();

router.get("/", controller.getPlaygrounds);
router.get("/:tag", controller.getPlaygroundStatus);
router.post("/", controller.createPlayground);
router.delete("/:tag", controller.deletePlayground);

export { router as PlaygroundRoutes };
