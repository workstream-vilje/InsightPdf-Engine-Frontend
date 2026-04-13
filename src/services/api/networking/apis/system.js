import httpClient from "@/services/axios";
import { health, root } from "@/services/api/networking/endpoints";

export const systemApi = {
  getHealth: () => httpClient.get(health),
  getRoot: () => httpClient.get(root),
};

export default systemApi;
