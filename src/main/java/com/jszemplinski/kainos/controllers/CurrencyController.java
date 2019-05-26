package com.jszemplinski.kainos.controllers;

import com.jszemplinski.kainos.services.CurrencyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api")
public class CurrencyController {

    private CurrencyService currencyService;

    @Autowired
    public void setCurrencyService(CurrencyService currencyService) {
        this.currencyService = currencyService;
    }

    @GetMapping("/getAvailableCurrencies")
    public ResponseEntity<?> getAvailableCurrencies() {
        String response = currencyService.getAvailableCurrencies();
        if (response == null) return ResponseEntity.unprocessableEntity().build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/getRTExchangeRate/{currFrom}/{currTo}")
    public ResponseEntity<?> getRealTimeExchangeRate(@PathVariable("currFrom") String currFrom,
                                                     @PathVariable("currTo") String currTo) {
        Double response = currencyService.getCurrencyExchangeRate(currFrom, currTo);
        if (response == null) return ResponseEntity.unprocessableEntity().build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/getHistoricalData/{currFrom}/{currTo}")
    public ResponseEntity<?> getHistoricalData(@PathVariable("currFrom") String currFrom,
                                               @PathVariable("currTo") String currTo) {
        String response = currencyService.getHistoricalData(currFrom, currTo);
        if (response == null) return ResponseEntity.unprocessableEntity().build();

        return ResponseEntity.ok(response);
    }

}
