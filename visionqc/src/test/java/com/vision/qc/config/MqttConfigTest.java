package com.vision.qc.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vision.qc.service.BottleInspectionService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class MqttConfigTest {
    @Test
    void usesConfiguredBrokerAndCredentials() {
        MqttConfig config = new MqttConfig(mock(BottleInspectionService.class), new ObjectMapper());
        ReflectionTestUtils.setField(config, "brokerUrl", "tcp://test-broker:1884");
        ReflectionTestUtils.setField(config, "username", "test-user");
        ReflectionTestUtils.setField(config, "password", "test-only-password");
        var options = config.mqttClientFactory().getConnectionOptions();
        assertArrayEquals(new String[]{"tcp://test-broker:1884"}, options.getServerURIs());
        assertEquals("test-user", options.getUserName());
        assertArrayEquals("test-only-password".toCharArray(), options.getPassword());
        assertFalse(options.isCleanSession());
    }
}
