import httpClient from "@/services/axios";
import { health, root } from "@/networking/endpoints";

export const systemApi = {
  getHealth: () => httpClient.get(health),
  getRoot: () => httpClient.get(root),
};

export default systemApi;
