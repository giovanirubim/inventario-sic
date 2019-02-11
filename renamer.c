#include <stdlib.h>
#include <string.h>
#include <stdio.h>
int main() {
	system("dir > output.txt");
	FILE* f1 = fopen("output.txt", "r");
	FILE* f2 = fopen("script.bat", "w");
	char buffer[1024];
	int id = 0;
	for (;;) {
		fgets(buffer, 1024, f1);
		if (feof(f1)) break;
		if (!strstr(buffer, ".png")) continue;
		char fname[256];
		sscanf(buffer, "%*s %*s %*s %[^\n]", fname);
		sprintf(buffer, "ren \"%s\" img%d.png", fname, ++id);
		fprintf(f2, "%s\n", buffer);
	}
	fprintf(f2, "del output.txt\n");
	fprintf(f2, "del script.bat\n");
	fclose(f1);
	fclose(f2);
	system("script.bat");
}