import 'package:flutter/material.dart';

import '../../data/demo_store.dart';
import '../../design/tokens.dart';
import '../../design/theme.dart';
import '../../widgets/pressable.dart';

class TutorMessage {
  final bool fromStudent;
  final String text; // Latin or Bengali, rendered by _bubbleTextStyle
  final String? citation;
  final String? worked;
  const TutorMessage({
    required this.fromStudent,
    required this.text,
    this.citation,
    this.worked,
  });
}

/// Shikha, the tutor. On demo data this is a scripted stub with the exact
/// response shapes the RAG endpoint will return: text, an optional worked
/// example block, and an optional textbook citation. Swapping in
/// `/v1/tutor/chat` changes this class, not the screen.
class TutorScreen extends StatefulWidget {
  final String? seedTopic;
  const TutorScreen({super.key, this.seedTopic});

  @override
  State<TutorScreen> createState() => _TutorScreenState();
}

class _TutorScreenState extends State<TutorScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final List<TutorMessage> _messages = [];
  bool _typing = false;

  @override
  void initState() {
    super.initState();
    if (widget.seedTopic == 'covered-today') {
      final data = DemoStore.instance.data;
      final first = data.coverageToday.isNotEmpty ? data.coverageToday.first : null;
      if (first != null) {
        _messages.add(TutorMessage(
          fromStudent: true,
          text: 'আজ ক্লাসে কী হয়েছে আবার বুঝিয়ে বলো?',
        ));
        _messages.add(TutorMessage(
          fromStudent: false,
          text: '${first.coveredEn} — চলো এটা আবার ধাপে ধাপে দেখি।',
        ));
      }
    }
  }

  void _send(String text) {
    if (text.trim().isEmpty || _typing) return;
    setState(() {
      _messages.add(TutorMessage(fromStudent: true, text: text.trim()));
      _typing = true;
    });
    _controller.clear();
    _scrollDown();

    final reply = _scriptedReply(text.trim());
    Future.delayed(const Duration(milliseconds: 900), () {
      if (!mounted) return;
      setState(() {
        _messages.add(reply);
        _typing = false;
      });
      _scrollDown();
    });
  }

  TutorMessage _scriptedReply(String q) {
    final lower = q.toLowerCase();
    if (lower.contains('fraction') || q.contains('ভগ্নাংশ')) {
      return const TutorMessage(
        fromStudent: false,
        text: 'কোনো সমস্যা নেই! ভগ্নাংশ (fraction) মানে কোনো পূর্বকে জিনিসকে সমান কয়েকটি অংশে ভাগ করে তার কিছু অংশ নেওয়া। যোগ করতে হলে প্রথমে তাদের হর (denominator) একই করে নিতে হয়।',
        worked: '1/2 + 1/3 = 3/6 + 2/6 = 5/6',
        citation: 'Textbook · Class VIII Maths · p. 84',
      );
    }
    if (lower.contains('practice') || q.contains('অভ্যাস')) {
      return const TutorMessage(
        fromStudent: false,
        text: 'তিনটি অঙ্ক দিচ্ছি — ১) ২/৫ + ১/৫ = ?  ২) ৩/৪ − ১/২ = ?  ৩) ২/৩ × ৬ = ? করে আমাকে দেখাও, আমি মিলিয়ে দেব।',
        citation: 'Practice set · Fractions · Class VIII',
      );
    }
    if (lower.contains('element') || q.contains('মৌল')) {
      return const TutorMessage(
        fromStudent: false,
        text: 'মৌল (element) মানে এমন পদার্থ যাকে আর সরল পদার্থে ভাগ করা যায় না। যেমন — অক্সিজেন (O), লোহা (Fe), সোনা (Au)। প্রতিটির একটি নিজস্ব প্রতীক আছে।',
        citation: 'Textbook · Class VIII Science · p. 41',
      );
    }
    return TutorMessage(
      fromStudent: false,
      text: 'ভালো প্রশ্ন! আজ তোমাদের ক্লাসে যা পড়ানো হয়েছে সেটার সাথে এটা জুড়ে বোঝা সবচেয়ে সহজ। চাইলে নির্দিষ্ট অধ্যায় বা শব্দটা লিখে বলো, আমি বইয়ের পাতা ধরে বুঝিয়ে দিচ্ছি।',
    );
  }

  void _scrollDown() {
    Future.delayed(const Duration(milliseconds: 60), () {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: AppMotion.durationBase,
          curve: AppMotion.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 8,
        leading: const BackButton(),
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: const BoxDecoration(
                color: AppColors.blueTint,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.auto_awesome, color: AppColors.blue, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Shikha · এআই শিক্ষক', style: bnText(size: 16, weight: FontWeight.w700)),
                  Text('Grounded in your textbook',
                      style: latinText(size: 12, color: AppColors.inkTertiary)),
                ],
              ),
            ),
          ],
        ),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(
              child: _messages.isEmpty
                  ? _EmptyTutor(onSuggestion: _send)
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                      itemCount: _messages.length + (_typing ? 1 : 0),
                      itemBuilder: (context, i) {
                        if (_typing && i == _messages.length) return _TypingBubble();
                        final m = _messages[i];
                        return _Bubble(message: m);
                      },
                    ),
            ),
            if (_messages.isNotEmpty) _SuggestionRow(onTap: _send),
            _Composer(controller: _controller, onSend: _send),
          ],
        ),
      ),
    );
  }
}

class _EmptyTutor extends StatelessWidget {
  final ValueChanged<String> onSuggestion;
  const _EmptyTutor({required this.onSuggestion});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(color: AppColors.blueTint, shape: BoxShape.circle),
              child: const Icon(Icons.auto_awesome, color: AppColors.blue, size: 32),
            ),
            const SizedBox(height: 16),
            Text('হ্যালো! আমি শিখা',
                style: bnText(size: 20, weight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(
              'যা বুঝি না জিজ্ঞাসা করো — বইয়ের পাতা ধরে বাংলায় বা ইংরেজিতে বুঝিয়ে দিচ্ছি।',
              textAlign: TextAlign.center,
              style: bnText(size: 15, color: AppColors.inkSecondary),
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                for (final s in const ['ভগ্নাংশ আবার বুঝাও', 'Give me practice', 'মৌল কী?'])
                  Pressable(
                    onTap: () => onSuggestion(s),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(AppRadius.full),
                        border: Border.all(color: AppColors.separator),
                      ),
                      child: Text(s, style: bnText(size: 14, color: AppColors.blue)),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  final TutorMessage message;
  const _Bubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final fromStudent = message.fromStudent;
    final style = fromStudent
        ? latinText(size: 16, color: Colors.white, height: 1.35)
        : bnText(size: 16, color: AppColors.ink, height: 1.5);
    return Align(
      alignment: fromStudent ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
        decoration: BoxDecoration(
          color: fromStudent ? AppColors.blue : AppColors.surface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(20),
            topRight: const Radius.circular(20),
            bottomLeft: Radius.circular(fromStudent ? 20 : 6),
            bottomRight: Radius.circular(fromStudent ? 6 : 20),
          ),
          boxShadow: fromStudent ? null : cardShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message.text, style: style),
            if (message.worked != null) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.fill,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Text(message.worked!,
                    textAlign: TextAlign.center,
                    style: latinText(size: 19, weight: FontWeight.w700, letterSpacing: 0.2)),
              ),
            ],
            if (message.citation != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.canvas,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  border: Border.all(color: AppColors.separator),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.menu_book_outlined, size: 14, color: AppColors.inkSecondary),
                    const SizedBox(width: 6),
                    Text(message.citation!, style: latinText(size: 12, color: AppColors.inkSecondary)),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
            bottomRight: Radius.circular(20),
          ),
          boxShadow: cardShadow,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < 3; i++)
              Container(
                width: 6,
                height: 6,
                margin: EdgeInsets.only(right: i == 2 ? 0 : 4),
                decoration: const BoxDecoration(color: AppColors.fillSecondary, shape: BoxShape.circle),
              ),
          ],
        ),
      ),
    );
  }
}

class _SuggestionRow extends StatelessWidget {
  final ValueChanged<String> onTap;
  const _SuggestionRow({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          for (final s in const ['Explain simpler', 'Give me practice', 'In Bengali'])
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Pressable(
                onTap: () => onTap(s),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                    border: Border.all(color: AppColors.separator),
                  ),
                  child: Text(s, style: latinText(size: 14, weight: FontWeight.w600, color: AppColors.blue)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onSend;
  const _Composer({required this.controller, required this.onSend});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadius.full),
                border: Border.all(color: AppColors.separator),
              ),
              child: TextField(
                controller: controller,
                onSubmitted: onSend,
                style: bnText(size: 16),
                decoration: InputDecoration(
                  hintText: 'Ask anything… · জিজ্ঞাসা করো',
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Pressable(
            onTap: () => onSend(controller.text),
            child: Container(
              width: 44,
              height: 44,
              decoration: const BoxDecoration(color: AppColors.blue, shape: BoxShape.circle),
              child: const Icon(Icons.arrow_upward, color: Colors.white, size: 22),
            ),
          ),
        ],
      ),
    );
  }
}
