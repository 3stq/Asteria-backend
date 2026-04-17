import { readdir, stat } from "fs/promises";
import { join } from "path";
import { Hono } from "hono";

async function loadRoute(directory: string, file: string, app: Hono) {
  try {
    const RouteModule = await import(join(directory, file));
    const defaultExport = RouteModule.default;

    if (defaultExport && typeof defaultExport === "function") {
      defaultExport(app);
    } else {
      console.error(`${file} does not export a valid route initializer`);
    }
  } catch (error) {
    console.error(`Error loading route ${file}: ${(error as Error).message}`);
  }
}

export default {
  async loadRoutes(directory: string, app: Hono): Promise<void> {
    try {
      const files = await readdir(directory);

      await Promise.all(
        files.map(async (file) => {
          const filePath = join(directory, file);
          const fileStats = await stat(filePath);

          if (fileStats.isDirectory()) {
            await this.loadRoutes(filePath, app);
          } else if (
            fileStats.isFile() &&
            (file.endsWith(".ts") || file.endsWith(".js"))
          ) {
            await loadRoute(directory, file, app);
          }
        })
      );
    } catch (error) {
      console.error(`Failed to load routes: ${error}`);
    }
  },
};
