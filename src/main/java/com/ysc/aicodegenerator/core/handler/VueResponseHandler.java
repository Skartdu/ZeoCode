package com.ysc.aicodegenerator.core.handler;

import dev.langchain4j.model.StreamingResponseHandler;
import dev.langchain4j.model.output.Response;

public class VueResponseHandler implements StreamingResponseHandler {
    @Override
    public void onNext(String s) {

    }

    @Override
    public void onComplete(Response response) {
        StreamingResponseHandler.super.onComplete(response);
    }

    @Override
    public void onError(Throwable throwable) {

    }
}
