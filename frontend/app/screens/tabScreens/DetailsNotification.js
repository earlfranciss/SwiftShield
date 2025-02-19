import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, BarChart, Settings, ShieldAlert } from 'lucide-react';

const PhishingDetectionUI = () => {
    return (
        <SafeAreaView className="flex-1 bg-gradient-to-b from-black to-green-800">
            <View className="flex-row items-center p-4">
                <ArrowLeft className="text-green-300" size={24} />
                <Text className="text-green-300 text-lg ml-2">Detection Analysis</Text>
            </View>

            <View className="flex-1 items-center justify-center">
                <View className="items-center mb-6">
                    <ShieldAlert className="text-red-600" size={64} />
                    <Text className="text-red-600 text-lg mt-2">www.malicious.link</Text>
                    <Text className="text-white text-sm">URL</Text>
                </View>

                <Card className="bg-green-500 p-4 w-80 rounded-2xl shadow-lg">
                    <CardContent>
                        <Text className="text-black mb-2">Platform: <Text className="font-semibold">Text Message</Text></Text>
                        <Text className="text-black mb-2">Date Scanned: <Text className="font-semibold">November 15, 2024</Text></Text>
                        <Text className="text-black mb-2">Severity Level: <Text className="font-semibold text-red-600">High</Text></Text>
                        <Text className="text-black mb-2">Probability Percentage: <Text className="font-semibold">78%</Text></Text>
                        <Text className="text-black mb-2">Recommended Action: <Text className="font-semibold">Block URL</Text></Text>
                    </CardContent>
                </Card>
            </View>

            <View className="flex-row justify-between p-4 bg-gray-800">
                <Home className="text-green-300" size={28} />
                <BarChart className="text-green-300" size={28} />
                <Settings className="text-green-300" size={28} />
                <Button className="bg-green-500 p-2 rounded-2xl">Action</Button>
            </View>
        </SafeAreaView>
    );
};

export default PhishingDetectionUI;
