import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { LandingPage } from '@/components/landing/LandingPage';

export default function Index() {
    return Platform.OS === 'web' ? <LandingPage /> : <Redirect href="/app" />;
}
