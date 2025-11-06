import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/settings_provider.dart';
import '../learn/tile_recognition_screen.dart';
import '../learn/learning_path_screen.dart';
import '../practice/practice_screen.dart';
import '../auth/auth_screen.dart';
import '../progress/progress_screen.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _selectedIndex = 0;

  final List<Widget> _screens = [
    const HomeScreen(),
    const LearnScreen(),
    const PracticeScreen(),
    const ReferenceScreen(),
    const ProgressScreen(),
    const SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book),
            label: 'Learn',
          ),
          NavigationDestination(
            icon: Icon(Icons.casino_outlined),
            selectedIcon: Icon(Icons.casino),
            label: 'Practice',
          ),
          NavigationDestination(
            icon: Icon(Icons.library_books_outlined),
            selectedIcon: Icon(Icons.library_books),
            label: 'Reference',
          ),
          NavigationDestination(
            icon: Icon(Icons.trending_up_outlined),
            selectedIcon: Icon(Icons.trending_up),
            label: 'Progress',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}

// Placeholder screens - will be implemented in subsequent todos
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mahjong Learning'),
      ),
      body: const Center(
        child: Text('Home Screen - Coming Soon'),
      ),
    );
  }
}

class LearnScreen extends StatelessWidget {
  const LearnScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Learn'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSectionCard(
            context,
            title: 'Tile Recognition',
            description: 'Learn to identify all mahjong tiles',
            icon: Icons.view_module,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const TileRecognitionScreen(),
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          _buildSectionCard(
            context,
            title: 'Learning Path',
            description: 'Progressive lessons from beginner to advanced',
            icon: Icons.school,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const LearningPathScreen(),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSectionCard(
    BuildContext context, {
    required String title,
    required String description,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Card(
      child: ListTile(
        leading: Icon(icon, size: 40),
        title: Text(title),
        subtitle: Text(description),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

// PracticeScreen is now imported from practice/practice_screen.dart

class ReferenceScreen extends StatelessWidget {
  const ReferenceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reference'),
      ),
      body: const Center(
        child: Text('Reference Screen - Coming Soon'),
      ),
    );
  }
}

// ProgressScreen is now imported from progress/progress_screen.dart

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: Consumer<SettingsProvider>(
        builder: (context, settings, _) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              ListTile(
                title: const Text('Mahjong Variant'),
                subtitle: Text(settings.selectedVariant),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // Show variant selection dialog
                },
              ),
              ListTile(
                title: const Text('Language'),
                subtitle: Text(settings.locale.languageCode.toUpperCase()),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // Show language selection dialog
                },
              ),
              SwitchListTile(
                title: const Text('Dark Mode'),
                value: settings.themeMode == ThemeMode.dark,
                onChanged: (value) {
                  settings.setThemeMode(
                    value ? ThemeMode.dark : ThemeMode.light,
                  );
                },
              ),
              SwitchListTile(
                title: const Text('Sounds'),
                value: settings.soundEnabled,
                onChanged: settings.setSoundEnabled,
              ),
              SwitchListTile(
                title: const Text('Notifications'),
                value: settings.notificationsEnabled,
                onChanged: settings.setNotificationsEnabled,
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.person),
                title: const Text('Account'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const ProfileScreen(),
                    ),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}

