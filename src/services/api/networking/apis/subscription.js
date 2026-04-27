import httpClient from "@/services/axios";
import {
  fetchCurrentSubscription,
  fetchSubscriptionPlans,
  updateCurrentSubscription,
} from "@/services/api/networking/endpoints";

export const subscriptionApi = {
  fetchCurrentSubscription: () => httpClient.get(fetchCurrentSubscription),
  fetchPlans: () => httpClient.get(fetchSubscriptionPlans),
  updateCurrentSubscription: (payload) =>
    httpClient.put(updateCurrentSubscription, payload),
};

export default subscriptionApi;
