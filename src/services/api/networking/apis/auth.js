import httpClient from "@/services/axios";

export const authApi = {
  updateUserName: (name) => httpClient.put("/auth/user/name", { name }),
  deleteAccount: () => httpClient.delete("/auth/user"),
};

export default authApi;
