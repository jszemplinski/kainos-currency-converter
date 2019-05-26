package com.jszemplinski.kainos.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import net.minidev.json.JSONArray;
import net.minidev.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;

@Service
public class CurrencyService {

    private final String API_KEY = "HOVK82G2EQNQ04GA";
    private final String URI_OER = "https://openexchangerates.org/api/currencies.json";
    private final String URI_AV = "https://www.alphavantage.co/query?";

    private RestTemplate restTemplate;

    public CurrencyService() {
        this.restTemplate = new RestTemplate();
    }

    public String getAvailableCurrencies() {
        String json = restTemplate.getForObject(URI_OER, String.class);

        ArrayList<String> resultArr = new ArrayList<>();

        ObjectMapper mapper = new ObjectMapper();
        try {
            ObjectNode node = (ObjectNode)mapper.readTree(json);
            for (Iterator<String> it = node.fieldNames(); it.hasNext(); ) {
                String currencyCode = it.next();
                resultArr.add(currencyCode);
            }
        } catch (IOException e) {
            return null;
        }

        try {
            return mapper.writeValueAsString(resultArr);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    public Double getCurrencyExchangeRate(String currFrom, String currTo) {
        String uri = URI_AV + "function=CURRENCY_EXCHANGE_RATE&from_currency=" + currFrom +
                "&to_currency=" + currTo + "&apikey=" + API_KEY;
        String json = restTemplate.getForObject(uri, String.class);

        ObjectMapper mapper = new ObjectMapper();
        try {
            ObjectNode node = (ObjectNode)mapper.readTree(json);
            JsonNode dataNode = node.get("Realtime Currency Exchange Rate");
            if (dataNode == null) return null;
            return dataNode.findValue("5. Exchange Rate").asDouble();
        } catch (IOException e) {
            return null;
        }
    }

    public String getHistoricalData(String currFrom, String currTo, int dayLimit) {
        String uri = URI_AV + "function=FX_DAILY&from_symbol=" + currFrom +
                "&to_symbol=" + currTo + "&apikey=" + API_KEY;
        String json = restTemplate.getForObject(uri, String.class);

        JSONArray resultArr = new JSONArray();

        ObjectMapper mapper = new ObjectMapper();
        try {
            ObjectNode node = (ObjectNode)mapper.readTree(json);
            JsonNode dataNode = node.get("Time Series FX (Daily)");
            if (dataNode == null) return null;
            for (Iterator<String> it = dataNode.fieldNames(); it.hasNext(); ) {
                String date = it.next();
                String value = dataNode.get(date).findValue("1. open").asText();

                JSONObject item = new JSONObject();
                item.put(date, value);
                resultArr.add(item);
            }

            if (dayLimit != -1) {
                JSONArray resultArrScaled = new JSONArray();
                for (int i = resultArr.size() - 1; i >= resultArr.size() - dayLimit && i >= 0; --i) {
                    resultArrScaled.add(resultArr.get(i));
                }
                return resultArrScaled.toJSONString();
            }

            return resultArr.toJSONString();
        } catch (IOException e) {
            return null;
        }
    }
}
