package com.vision.qc.config;

import com.vision.qc.dto.BottleInspectionDto;
import com.vision.qc.service.BottleInspectionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.core.MessageProducer;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class MqttConfig {

    private final BottleInspectionService inspectionService;
    private final ObjectMapper objectMapper;

    @Value("${mqtt.broker.url}")
    private String brokerUrl;
    @Value("${mqtt.broker.client-id}")
    private String clientId;
    @Value("${mqtt.broker.username}")
    private String username;
    @Value("${mqtt.broker.password}")
    private String password;
    @Value("${mqtt.broker.topic}")
    private String topic;

    @Bean
    public DefaultMqttPahoClientFactory mqttClientFactory() {
        MqttConnectOptions options = new MqttConnectOptions();
        options.setServerURIs(new String[]{brokerUrl});
        options.setUserName(username);
        options.setPassword(password.toCharArray());
        options.setCleanSession(false);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(30);
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        factory.setConnectionOptions(options);
        return factory;
    }

    @Bean
    public MessageChannel mqttInputChannel() {
        return new DirectChannel();
    }

    @Bean
    public MessageProducer inbound() {
        MqttPahoMessageDrivenChannelAdapter adapter =
                new MqttPahoMessageDrivenChannelAdapter(clientId, mqttClientFactory(), topic);
        adapter.setCompletionTimeout(5000);
        adapter.setConverter(new DefaultPahoMessageConverter());
        adapter.setQos(1);
        adapter.setOutputChannel(mqttInputChannel());
        return adapter;
    }

    @Bean
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public MessageHandler handler() {
        return message -> {
            try {
                String payload = (String) message.getPayload();
                BottleInspectionDto dto = objectMapper.readValue(payload, BottleInspectionDto.class);
                inspectionService.processInspection(dto).subscribe(
                        unused -> {},
                        error -> log.error("MQTT inspection Redis'e kaydedilemedi", error));
            } catch (Exception e) {
                log.error("MQTT inspection mesaji islenemedi", e);
            }
        };
    }
}
