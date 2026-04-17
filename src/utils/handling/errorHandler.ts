export async function HandleNotFound(c: any) {
  return c.json({
    errorCode: "errors.com.havoc.common.not_found",
    errorMessage: "",
  });
}
