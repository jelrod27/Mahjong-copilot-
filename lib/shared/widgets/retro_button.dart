import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../theme/app_theme.dart';
import '../theme/colors.dart';

enum RetroButtonVariant {
  primary,
  secondary,
  outline,
  text,
}

/// A 70s retro-styled button with smooth animations and micro-interactions
class RetroButton extends StatefulWidget {
  final String text;
  final IconData? icon;
  final VoidCallback? onPressed;
  final RetroButtonVariant variant;
  final bool isLoading;
  final bool isFullWidth;
  final Duration animationDelay;

  const RetroButton({
    super.key,
    required this.text,
    this.icon,
    this.onPressed,
    this.variant = RetroButtonVariant.primary,
    this.isLoading = false,
    this.isFullWidth = true,
    this.animationDelay = Duration.zero,
  });

  @override
  State<RetroButton> createState() => _RetroButtonState();
}

class _RetroButtonState extends State<RetroButton> {
  bool _isPressed = false;
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final isEnabled = widget.onPressed != null && !widget.isLoading;

    return MouseRegion(
      onEnter: isEnabled ? (_) => setState(() => _isHovered = true) : null,
      onExit: isEnabled ? (_) => setState(() => _isHovered = false) : null,
      child: GestureDetector(
        onTapDown: isEnabled ? (_) => setState(() => _isPressed = true) : null,
        onTapUp: isEnabled
            ? (_) {
                setState(() => _isPressed = false);
                widget.onPressed?.call();
              }
            : null,
        onTapCancel: isEnabled ? () => setState(() => _isPressed = false) : null,
        child: _buildAnimatedButton(isEnabled),
      ),
    );
  }

  Widget _buildAnimatedButton(bool isEnabled) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      curve: Curves.easeOutCubic,
      transform: Matrix4.identity()
        ..scale(_isPressed ? 0.95 : (_isHovered ? 1.02 : 1.0)),
      transformAlignment: Alignment.center,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: widget.isFullWidth ? double.infinity : null,
        padding: EdgeInsets.symmetric(
          horizontal: AppTheme.spacingLg,
          vertical: widget.variant == RetroButtonVariant.text
              ? AppTheme.spacingSm
              : AppTheme.spacingMd,
        ),
        decoration: _getDecoration(),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: widget.isFullWidth ? MainAxisSize.max : MainAxisSize.min,
          children: [
            if (widget.isLoading)
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(_getTextColor()),
                ),
              )
                  .animate(onPlay: (c) => c.repeat())
                  .rotate(duration: 1000.ms)
            else if (widget.icon != null) ...[
              Icon(
                widget.icon,
                color: _getTextColor(),
                size: 24,
              )
                  .animate(target: _isHovered ? 1 : 0)
                  .scale(begin: 1.0, end: 1.15, duration: 150.ms),
              const SizedBox(width: AppTheme.spacingSm),
            ],
            Text(
              widget.text,
              style: AppTheme.buttonText.copyWith(
                color: _getTextColor(),
                fontSize: widget.variant == RetroButtonVariant.text ? 14 : 18,
              ),
            ),
          ],
        ),
      ),
    )
        .animate(delay: widget.animationDelay)
        .fadeIn(duration: 300.ms, curve: Curves.easeOut)
        .slideY(begin: 0.2, end: 0, duration: 300.ms, curve: Curves.easeOutCubic);
  }

  BoxDecoration _getDecoration() {
    final shadowOpacity = _isPressed ? 0.2 : (_isHovered ? 0.5 : 0.4);
    final shadowBlur = _isPressed ? 4.0 : (_isHovered ? 12.0 : 8.0);
    final shadowOffset = _isPressed ? const Offset(0, 2) : const Offset(0, 4);

    switch (widget.variant) {
      case RetroButtonVariant.primary:
        return BoxDecoration(
          gradient: AppColors.retroButtonGradient,
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(shadowOpacity),
              blurRadius: shadowBlur,
              offset: shadowOffset,
            ),
            if (_isHovered)
              BoxShadow(
                color: AppColors.primary.withOpacity(0.2),
                blurRadius: 20,
                spreadRadius: 2,
              ),
          ],
        );

      case RetroButtonVariant.secondary:
        return BoxDecoration(
          color: AppColors.secondary,
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          boxShadow: [
            BoxShadow(
              color: AppColors.secondary.withOpacity(shadowOpacity),
              blurRadius: shadowBlur,
              offset: shadowOffset,
            ),
            if (_isHovered)
              BoxShadow(
                color: AppColors.secondary.withOpacity(0.2),
                blurRadius: 20,
                spreadRadius: 2,
              ),
          ],
        );

      case RetroButtonVariant.outline:
        return BoxDecoration(
          color: _isHovered
              ? AppColors.primary.withOpacity(0.08)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          border: Border.all(
            color: AppColors.primary,
            width: _isHovered ? 2.5 : 2,
          ),
        );

      case RetroButtonVariant.text:
        return BoxDecoration(
          color: _isHovered
              ? AppColors.surface.withOpacity(0.8)
              : AppColors.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        );
    }
  }

  Color _getTextColor() {
    switch (widget.variant) {
      case RetroButtonVariant.primary:
      case RetroButtonVariant.secondary:
        return AppColors.textLight;
      case RetroButtonVariant.outline:
      case RetroButtonVariant.text:
        return AppColors.primary;
    }
  }
}

/// An icon button with retro styling and animations
class RetroIconButton extends StatefulWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final Color? color;
  final Color? backgroundColor;
  final double size;
  final String? tooltip;

  const RetroIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.color,
    this.backgroundColor,
    this.size = 48,
    this.tooltip,
  });

  @override
  State<RetroIconButton> createState() => _RetroIconButtonState();
}

class _RetroIconButtonState extends State<RetroIconButton> {
  bool _isPressed = false;
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final isEnabled = widget.onPressed != null;
    final effectiveColor = widget.color ?? AppColors.primary;
    final effectiveBgColor = widget.backgroundColor ?? AppColors.surface;

    Widget button = MouseRegion(
      onEnter: isEnabled ? (_) => setState(() => _isHovered = true) : null,
      onExit: isEnabled ? (_) => setState(() => _isHovered = false) : null,
      child: GestureDetector(
        onTapDown: isEnabled ? (_) => setState(() => _isPressed = true) : null,
        onTapUp: isEnabled
            ? (_) {
                setState(() => _isPressed = false);
                widget.onPressed?.call();
              }
            : null,
        onTapCancel: isEnabled ? () => setState(() => _isPressed = false) : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: widget.size,
          height: widget.size,
          transform: Matrix4.identity()
            ..scale(_isPressed ? 0.9 : (_isHovered ? 1.1 : 1.0)),
          transformAlignment: Alignment.center,
          decoration: BoxDecoration(
            color: effectiveBgColor,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: effectiveColor.withOpacity(_isHovered ? 0.3 : 0.15),
                blurRadius: _isHovered ? 12 : 6,
                offset: Offset(0, _isPressed ? 1 : 3),
              ),
            ],
          ),
          child: Icon(
            widget.icon,
            color: effectiveColor,
            size: widget.size * 0.5,
          )
              .animate(target: _isHovered ? 1 : 0)
              .rotate(begin: 0, end: 0.05, duration: 150.ms),
        ),
      ),
    );

    if (widget.tooltip != null) {
      button = Tooltip(
        message: widget.tooltip!,
        child: button,
      );
    }

    return button
        .animate()
        .fadeIn(duration: 200.ms)
        .scale(begin: 0.8, end: 1.0, duration: 200.ms, curve: Curves.easeOut);
  }
}
