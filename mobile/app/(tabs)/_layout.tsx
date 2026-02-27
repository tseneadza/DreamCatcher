import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dreams"
        options={{
          title: 'Dreams',
          tabBarIcon: ({ color }) => <TabBarIcon name="cloud" color={color} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color }) => <TabBarIcon name="flag" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ideas"
        options={{
          title: 'Ideas',
          tabBarIcon: ({ color }) => <TabBarIcon name="lightbulb-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sleep"
        options={{
          title: 'Sleep',
          tabBarIcon: ({ color }) => <TabBarIcon name="moon-o" color={color} />,
        }}
      />
    </Tabs>
  );
}
