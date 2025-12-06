package com.memoway.app;

import android.app.Activity;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesResponseListener;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.AcknowledgePurchaseResponseListener;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "GooglePlayBilling")
public class GooglePlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private static final String TAG = "GooglePlayBilling";
    private BillingClient billingClient;
    private boolean isServiceConnected = false;
    private PluginCall pendingPurchaseCall = null;

    @Override
    public void load() {
        super.load();
        initializeBillingClient();
    }

    private void initializeBillingClient() {
        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases()
                .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    isServiceConnected = true;
                    Log.d(TAG, "Billing service connected");
                } else {
                    Log.e(TAG, "Billing service connection failed: " + billingResult.getResponseCode());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                isServiceConnected = false;
                Log.d(TAG, "Billing service disconnected");
            }
        });
    }

    @PluginMethod
    public void queryProductDetails(PluginCall call) {
        if (!isServiceConnected) {
            call.reject("Billing service not connected");
            return;
        }

        JSONArray productIdsArray = call.getArray("productIds");
        if (productIdsArray == null) {
            call.reject("productIds is required");
            return;
        }

        List<String> productIds = new ArrayList<>();
        try {
            for (int i = 0; i < productIdsArray.length(); i++) {
                productIds.add(productIdsArray.getString(i));
            }
        } catch (JSONException e) {
            call.reject("Invalid productIds format: " + e.getMessage());
            return;
        }

        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String productId : productIds) {
            products.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build());
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(products)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("Failed to query products: " + billingResult.getResponseCode());
                return;
            }

            try {
                JSONArray productsJson = new JSONArray();
                for (ProductDetails productDetails : productDetailsList) {
                    JSONObject productJson = new JSONObject();
                    productJson.put("productId", productDetails.getProductId());
                    
                    // Get subscription offer details
                    if (productDetails.getSubscriptionOfferDetails() != null && 
                        !productDetails.getSubscriptionOfferDetails().isEmpty()) {
                        ProductDetails.SubscriptionOfferDetails offer = 
                            productDetails.getSubscriptionOfferDetails().get(0);
                        
                        if (offer.getPricingPhases() != null && !offer.getPricingPhases().getPricingPhaseList().isEmpty()) {
                            ProductDetails.PricingPhase pricingPhase = 
                                offer.getPricingPhases().getPricingPhaseList().get(0);
                            
                            productJson.put("price", pricingPhase.getFormattedPrice());
                            productJson.put("priceAmountMicros", pricingPhase.getPriceAmountMicros());
                            productJson.put("priceCurrencyCode", pricingPhase.getPriceCurrencyCode());
                            productJson.put("billingPeriod", pricingPhase.getBillingPeriod());
                        }
                        
                        productJson.put("title", productDetails.getTitle());
                        productJson.put("description", productDetails.getDescription());
                    }
                    
                    productsJson.put(productJson);
                }
                
                JSObject result = new JSObject();
                result.put("products", productsJson);
                call.resolve(result);
            } catch (JSONException e) {
                call.reject("Failed to serialize products: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void launchBillingFlow(PluginCall call) {
        if (!isServiceConnected) {
            call.reject("Billing service not connected");
            return;
        }

        String productId = call.getString("productId");
        if (productId == null) {
            call.reject("productId is required");
            return;
        }

        // Query product details first
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        products.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(products)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || 
                productDetailsList.isEmpty()) {
                call.reject("Product not found: " + productId);
                return;
            }

            ProductDetails productDetails = productDetailsList.get(0);
            
            // Get the first offer token
            if (productDetails.getSubscriptionOfferDetails() == null || 
                productDetails.getSubscriptionOfferDetails().isEmpty()) {
                call.reject("No subscription offers available");
                return;
            }

            ProductDetails.SubscriptionOfferDetails offer = 
                productDetails.getSubscriptionOfferDetails().get(0);
            String offerToken = offer.getOfferToken();

            // Build billing flow params
            List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
            productDetailsParamsList.add(BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(productDetails)
                    .setOfferToken(offerToken)
                    .build());

            BillingFlowParams billingFlowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(productDetailsParamsList)
                    .build();

            pendingPurchaseCall = call;
            Activity activity = getActivity();
            if (activity == null) {
                call.reject("Activity not available");
                return;
            }

            BillingResult launchResult = billingClient.launchBillingFlow(activity, billingFlowParams);
            if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                pendingPurchaseCall = null;
                call.reject("Failed to launch billing flow: " + launchResult.getResponseCode());
            }
        });
    }

    @PluginMethod
    public void queryPurchases(PluginCall call) {
        if (!isServiceConnected) {
            call.reject("Billing service not connected");
            return;
        }

        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("Failed to query purchases: " + billingResult.getResponseCode());
                return;
            }

            try {
                JSONArray purchasesJson = new JSONArray();
                for (Purchase purchase : purchases) {
                    JSONObject purchaseJson = new JSONObject();
                    purchaseJson.put("orderId", purchase.getOrderId());
                    purchaseJson.put("packageName", purchase.getPackageName());
                    purchaseJson.put("purchaseTime", purchase.getPurchaseTime());
                    purchaseJson.put("purchaseToken", purchase.getPurchaseToken());
                    purchaseJson.put("signature", purchase.getSignature());
                    purchaseJson.put("products", new JSONArray(purchase.getProducts()));
                    purchaseJson.put("isAcknowledged", purchase.isAcknowledged());
                    purchaseJson.put("isAutoRenewing", purchase.isAutoRenewing());
                    
                    purchasesJson.put(purchaseJson);
                }
                
                JSObject result = new JSObject();
                result.put("purchases", purchasesJson);
                call.resolve(result);
            } catch (JSONException e) {
                call.reject("Failed to serialize purchases: " + e.getMessage());
            }
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        if (pendingPurchaseCall == null) {
            return;
        }

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                // Acknowledge purchase if not already acknowledged
                if (!purchase.isAcknowledged()) {
                    AcknowledgePurchaseParams acknowledgeParams = AcknowledgePurchaseParams.newBuilder()
                            .setPurchaseToken(purchase.getPurchaseToken())
                            .build();

                    billingClient.acknowledgePurchase(acknowledgeParams, new AcknowledgePurchaseResponseListener() {
                        @Override
                        public void onAcknowledgePurchaseResponse(BillingResult billingResult) {
                            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                                Log.d(TAG, "Purchase acknowledged");
                            } else {
                                Log.e(TAG, "Failed to acknowledge purchase: " + billingResult.getResponseCode());
                            }
                        }
                    });
                }

                // Return purchase info to JavaScript
                try {
                    JSONObject purchaseJson = new JSONObject();
                    purchaseJson.put("orderId", purchase.getOrderId());
                    purchaseJson.put("packageName", purchase.getPackageName());
                    purchaseJson.put("purchaseTime", purchase.getPurchaseTime());
                    purchaseJson.put("purchaseToken", purchase.getPurchaseToken());
                    purchaseJson.put("signature", purchase.getSignature());
                    purchaseJson.put("products", new JSONArray(purchase.getProducts()));
                    purchaseJson.put("isAcknowledged", purchase.isAcknowledged());
                    purchaseJson.put("isAutoRenewing", purchase.isAutoRenewing());

                    JSObject result = new JSObject();
                    result.put("purchase", purchaseJson);
                    pendingPurchaseCall.resolve(result);
                } catch (JSONException e) {
                    pendingPurchaseCall.reject("Failed to serialize purchase: " + e.getMessage());
                }
            }
        } else {
            String errorMessage = "Purchase failed: " + billingResult.getResponseCode();
            if (billingResult.getDebugMessage() != null) {
                errorMessage += " - " + billingResult.getDebugMessage();
            }
            pendingPurchaseCall.reject(errorMessage);
        }

        pendingPurchaseCall = null;
    }
}













